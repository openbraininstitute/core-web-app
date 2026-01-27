'use client';

import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckboxProps } from 'antd';
import { Checkbox, ConfigProvider, Modal } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { requestOfflineTokenConsent } from '@/api/auth-manager';
import {
  getCircuitExtractionConfigs,
  getCircuitExtractionExecutions,
} from '@/api/entitycore/queries/extraction';
import type { ICircuitExtractionConfig } from '@/api/entitycore/types/entities/circuit-extraction-config';
import {
  CircuitExtractionExecutionStatus,
  type TCircuitExtractionExecutionStatus,
} from '@/api/entitycore/types/entities/circuit-extraction-execution';
import { launchExtraction } from '@/api/one/extraction';
import { Loader } from '@/components/loader';
import { useAppNotification } from '@/components/notification';
import styles from '@/features/scan-config/scan-config.module.css';
import { useConsent } from '@/services/consent';
import { executionStatusColorMap } from '@/ui/segments/activity-execution/color-map';
import { classNames } from '@/util/utils';
import { log } from '@/utils/logger';

const USER_CANCELLED = 'user_cancelled';
const STATUS_POLL_INTERVAL = 15_000; // 15 seconds

type ExtractionTabProps = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

type Consent = {
  controller: AbortController;
  url: string;
};

const queryKeys = {
  extractionConfigs: (campaignId: string, context: { virtualLabId: string; projectId: string }) =>
    ['extraction-configs', campaignId, context] as const,
  extractionExecutions: (
    configIds: string[],
    context: { virtualLabId: string; projectId: string }
  ) => ['extraction-executions', configIds, context] as const,
};

export function ExtractionTab({ campaignId, virtualLabId, projectId }: ExtractionTabProps) {
  const notification = useAppNotification();
  const { waitForConsent } = useConsent();
  const queryClient = useQueryClient();
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [extractionRequestInProgress, setExtractionRequestInProgress] = useState<boolean>(false);
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [activeConfig, setActiveConfig] = useState<ICircuitExtractionConfig | null>(null);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);

  const { data: configsResponse, isLoading: configsLoading } = useQuery({
    queryKey: queryKeys.extractionConfigs(campaignId, context),
    queryFn: () =>
      getCircuitExtractionConfigs({
        filters: { circuit_extraction_campaign_id: campaignId },
        context,
      }),
  });

  const configs = configsResponse?.data ?? [];
  const configIds = configs.map((c) => c.id);

  const { data: executionsResponse, isLoading: executionsLoading } = useQuery({
    queryKey: queryKeys.extractionExecutions(configIds, context),
    queryFn: () =>
      getCircuitExtractionExecutions({
        filters: { used__id__in: configIds },
        context,
      }),
    enabled: configIds.length > 0,
    refetchInterval: (query) => {
      const executions = query.state.data?.data ?? [];
      const hasActiveExtractions = executions.some((exec) =>
        [
          CircuitExtractionExecutionStatus.PENDING,
          CircuitExtractionExecutionStatus.RUNNING,
        ].includes(exec.status as CircuitExtractionExecutionStatus)
      );
      return hasActiveExtractions && !extractionRequestInProgress ? STATUS_POLL_INTERVAL : false;
    },
  });

  const statusMap = useMemo(() => {
    const map = new Map<string, TCircuitExtractionExecutionStatus>();
    const executions = executionsResponse?.data ?? [];

    for (const config of configs) {
      const configExecutions = executions.filter((exec) =>
        exec.used?.some((used) => used.id === config.id)
      );
      if (configExecutions.length > 0) {
        const latestExecution = configExecutions.sort(
          (a, b) => new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime()
        )[0];
        map.set(config.id, latestExecution.status);
      }
    }

    return map;
  }, [configs, executionsResponse?.data]);

  const activeConfigExecStatus = activeConfig ? statusMap.get(activeConfig.id) : undefined;

  const onActiveConfigChange = useCallback((config: ICircuitExtractionConfig) => {
    setActiveConfig(config);
  }, []);

  const onSelectedForExtractionChange = useCallback((configId: string, selected: boolean) => {
    if (selected) {
      setSelectedConfigIds((prev) => [...prev, configId]);
    } else {
      setSelectedConfigIds((prev) => prev.filter((id) => id !== configId));
    }
  }, []);

  const selectableConfigIds = useMemo(() => {
    return configs
      .filter((config) => {
        const status = statusMap.get(config.id);
        return !status || status === 'created' || status === 'error';
      })
      .map((c) => c.id);
  }, [configs, statusMap]);

  useEffect(() => {
    if (configs.length > 0 && !initialSelectionDone && !configsLoading && !executionsLoading) {
      setSelectedConfigIds(selectableConfigIds);
      setInitialSelectionDone(true);
    }
  }, [configs, configsLoading, executionsLoading, initialSelectionDone, selectableConfigIds]);

  useEffect(() => {
    if (configs.length > 0 && !activeConfig) {
      onActiveConfigChange(configs[0]);
    }
  }, [configs, activeConfig, onActiveConfigChange]);

  const onConsentModalClose = () => {
    if (consent) {
      consent.controller.abort(USER_CANCELLED);
    }
    setConsent(null);
  };

  const launchExtractionMutation = useMutation({
    mutationFn: async (configId: string) => {
      return launchExtraction({
        ctx: { virtualLabId, projectId },
        entityType: 'CircuitExtractionConfig',
        entityId: configId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.extractionExecutions(configIds, context),
      });
    },
  });

  const runExtraction = async (configIdsToRun: string[]) => {
    setExtractionRequestInProgress(true);

    try {
      const consentRes = await requestOfflineTokenConsent();
      const consentUrl = consentRes.data.consent_url;

      if (consentUrl) {
        const controller = new AbortController();
        setConsent({ controller, url: consentUrl });
        window.open(consentUrl, '_blank');

        try {
          await waitForConsent(controller.signal);
        } catch (error) {
          if (error === USER_CANCELLED) {
            setExtractionRequestInProgress(false);
            return;
          }

          notification.error({
            message: 'Unexpected error occurred, please try again later',
            duration: 10,
          });
          setExtractionRequestInProgress(false);
          return;
        }
      }

      let successCount = 0;

      for (const configId of configIdsToRun) {
        try {
          const executionId = await launchExtractionMutation.mutateAsync(configId);
          log('info', `Extraction launched successfully, execution ID: ${executionId}`);
          successCount += 1;
        } catch (error) {
          log('error', `Failed to launch extraction for config ${configId}`, error);
        }
      }

      if (successCount === configIdsToRun.length) {
        notification.success({
          message: `Extraction${configIdsToRun.length > 1 ? 's' : ''} launched successfully.`,
          duration: 10,
        });
      } else if (successCount > 0) {
        notification.warning({
          message: `${successCount} of ${configIdsToRun.length} extraction(s) launched. Some failed to submit.`,
          duration: 10,
        });
      } else {
        notification.error({
          message: 'Failed to launch extractions. Please try again later.',
          duration: 10,
        });
      }

      setSelectedConfigIds([]);
      setConsent(null);
    } finally {
      setExtractionRequestInProgress(false);
    }
  };

  const onSelectedAll: CheckboxProps['onChange'] = (e) => {
    setSelectedConfigIds(e.target.checked ? selectableConfigIds : []);
  };

  const allSelected = useMemo(
    () => selectableConfigIds.length > 0 && selectableConfigIds.length === selectedConfigIds.length,
    [selectableConfigIds, selectedConfigIds]
  );

  const launchBtnLabelPrefix = selectedConfigIds.length ? `(${selectedConfigIds.length})` : '';
  const loading = configsLoading || executionsLoading;

  return (
    <div className={styles.threeColumns}>
      <div className="border-r border-gray-200 pr-4">
        <div className="flex h-full flex-col gap-4 overflow-y-hidden">
          <Checkbox
            indeterminate={
              selectedConfigIds.length > 0 && selectedConfigIds.length < selectableConfigIds.length
            }
            onChange={onSelectedAll}
            checked={allSelected}
            disabled={extractionRequestInProgress || selectableConfigIds.length === 0}
          >
            Select all
          </Checkbox>
          <div className="flex grow flex-col justify-start gap-5 overflow-y-auto">
            {loading && (
              <div className="flex h-full items-center justify-center">
                <Loader className="text-neutral-3" />
              </div>
            )}
            {!loading &&
              configs.map((config) => (
                <ExtractionConfigListItem
                  key={config.id}
                  selected={activeConfig?.id === config.id}
                  config={config}
                  execStatus={statusMap.get(config.id)}
                  onSelect={() => onActiveConfigChange(config)}
                  onSelectedForExtractionChange={onSelectedForExtractionChange}
                  selectedForExtraction={selectedConfigIds.includes(config.id)}
                  selectionDisabled={extractionRequestInProgress}
                />
              ))}
          </div>
          <button
            className={classNames(
              'min-h-[50] w-full cursor-pointer rounded-3xl p-2 text-white',
              'bg-[linear-gradient(94.93deg,#389E0D_18.84%,#143805_116.7%)]',
              'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:bg-none'
            )}
            type="button"
            onClick={() => runExtraction(selectedConfigIds)}
            disabled={extractionRequestInProgress || selectedConfigIds.length === 0}
          >
            <div className="flex justify-center gap-4">
              <span className="pl-10">Launch extractions {launchBtnLabelPrefix}</span>
              <div className="w-6">{extractionRequestInProgress && <LoadingOutlined />}</div>
            </div>
          </button>
        </div>
      </div>

      <div className="relative border-r border-gray-200 px-4">
        {!!activeConfig && (
          <ExtractionConfigDetails config={activeConfig} execStatus={activeConfigExecStatus} />
        )}
      </div>

      <div className="relative pl-4">
        {!!activeConfig && (
          <ExtractionResultsPanel
            config={activeConfig}
            execStatus={activeConfigExecStatus}
            context={context}
          />
        )}
      </div>

      <Modal
        title="Waiting for the user consent"
        open={!!consent}
        onCancel={onConsentModalClose}
        okButtonProps={{ style: { display: 'none' } }}
      >
        <p className="text-lg">
          If the authorization window did not open automatically, please click the link below to
          continue.
        </p>
        <a
          className="text-primary-9 mt-4 inline-block text-lg font-semibold"
          href={consent?.url}
          target="_blank"
          rel="noreferrer"
        >
          Grant consent
        </a>
      </Modal>
    </div>
  );
}

type ExtractionConfigListItemProps = {
  config: ICircuitExtractionConfig;
  execStatus?: TCircuitExtractionExecutionStatus;
  onSelect: () => void;
  selected?: boolean;
  onSelectedForExtractionChange: (configId: string, selected: boolean) => void;
  selectedForExtraction: boolean;
  selectionDisabled?: boolean;
};

function ExtractionConfigListItem({
  config,
  execStatus,
  onSelect,
  selected,
  onSelectedForExtractionChange,
  selectedForExtraction,
  selectionDisabled,
}: ExtractionConfigListItemProps) {
  const color =
    executionStatusColorMap[execStatus ?? CircuitExtractionExecutionStatus.CREATED] ?? '#8c8c8c';
  const isSelectable = !execStatus || execStatus === 'created' || execStatus === 'error';

  return (
    <div className="flex-none">
      <div
        className="rounded-lg px-4 pb-4 transition-colors duration-300"
        style={{
          border: `2px solid ${selected ? color : 'transparent'}`,
          backgroundColor: selected ? `${color}0f` : 'white',
        }}
      >
        <button
          type="button"
          title={config.name}
          className="mb-2 flex h-18 w-full cursor-pointer items-center justify-between"
          onClick={onSelect}
        >
          <div className="min-w-0 flex-1 overflow-hidden text-left font-bold">
            {isSelectable ? (
              <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
                <div className="flex min-w-0 items-center" style={{ maxWidth: '100%' }}>
                  <Checkbox
                    className="mr-2 transition-colors duration-300 [&_.ant-checkbox+span]:block [&_.ant-checkbox+span]:truncate [&_.ant-checkbox+span]:overflow-hidden [&_.ant-checkbox+span]:text-ellipsis [&_.ant-checkbox+span]:whitespace-nowrap"
                    disabled={selectionDisabled}
                    onChange={(e) => onSelectedForExtractionChange(config.id, e.target.checked)}
                    checked={selectedForExtraction}
                    style={{ color, maxWidth: '100%', display: 'flex' }}
                  >
                    <span className="text-lg transition-colors duration-300">{config.name}</span>
                  </Checkbox>
                </div>
              </ConfigProvider>
            ) : (
              <span
                style={{ color }}
                className="block truncate text-lg transition-colors duration-300"
              >
                {config.name}
              </span>
            )}
          </div>
          <div className="ml-4 flex shrink-0">
            <ExtractionStatusBadge status={execStatus} />
            <RightOutlined className="ml-2 text-sm" />
          </div>
        </button>
        <ScanParams
          scanParams={config.scan_parameters as Record<string, string | number>}
          color={color}
        />
      </div>
    </div>
  );
}

function ExtractionStatusBadge({ status }: { status?: TCircuitExtractionExecutionStatus }) {
  const color = status
    ? executionStatusColorMap[status as CircuitExtractionExecutionStatus]
    : '#fafafa';
  const showSpinner = status && ['pending', 'running'].includes(status);

  return (
    <div className="flex items-center">
      {showSpinner && (
        <svg
          className="mr-4 h-4 w-4 animate-spin"
          style={{ color }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <title>Loading</title>
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span
        style={{ borderColor: color, color }}
        className="flex items-center rounded-xl border px-4 capitalize transition-colors duration-300"
      >
        {status ?? 'created'}
      </span>
    </div>
  );
}

function ScanParams({
  scanParams,
  color,
}: {
  scanParams: Record<string, string | number>;
  color: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(scanParams).map(([key, value]) => (
        <div key={key} className="overflow-x-hidden">
          <div title={key} className="truncate text-ellipsis text-gray-400">
            {key.split('.').at(-1)}
          </div>
          <div
            className="truncate font-bold text-ellipsis transition-colors duration-300"
            style={{ color }}
          >
            {String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExtractionConfigDetails({
  config,
  execStatus,
}: {
  config: ICircuitExtractionConfig;
  execStatus?: TCircuitExtractionExecutionStatus;
}) {
  const color =
    executionStatusColorMap[execStatus ?? CircuitExtractionExecutionStatus.CREATED] ?? '#8c8c8c';

  return (
    <div className="h-full overflow-y-auto">
      <h4 className="uppercase">Configuration Details</h4>
      <div className="mt-4 mb-8 flex flex-col gap-4">
        <div className="rounded-lg bg-white p-4">
          <div className="mb-2 text-gray-400">Name</div>
          <div className="font-semibold" style={{ color }}>
            {config.name}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4">
          <div className="mb-2 text-gray-400">Description</div>
          <div className="text-sm">{config.description || 'No description'}</div>
        </div>
        <div className="rounded-lg bg-white p-4">
          <div className="mb-2 text-gray-400">Circuit ID</div>
          <div className="font-mono text-sm">{config.circuit_id}</div>
        </div>
        <div className="rounded-lg bg-white p-4">
          <div className="mb-2 text-gray-400">Scan Parameters</div>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(config.scan_parameters, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function ExtractionResultsPanel({
  config,
  execStatus,
  context,
}: {
  config: ICircuitExtractionConfig;
  execStatus?: TCircuitExtractionExecutionStatus;
  context: { virtualLabId: string; projectId: string };
}) {
  const { data: executionsResponse, isLoading } = useQuery({
    queryKey: ['extraction-execution-details', config.id, context],
    queryFn: () =>
      getCircuitExtractionExecutions({
        filters: { used__id: config.id },
        context,
      }),
    enabled:
      !!execStatus &&
      [CircuitExtractionExecutionStatus.DONE, CircuitExtractionExecutionStatus.ERROR].includes(
        execStatus as CircuitExtractionExecutionStatus
      ),
  });

  const execution = executionsResponse?.data?.[0];
  const generatedEntities = execution?.generated ?? [];
  const color =
    executionStatusColorMap[execStatus ?? CircuitExtractionExecutionStatus.CREATED] ?? '#8c8c8c';

  return (
    <div className="text-primary-9 relative h-full rounded-2xl bg-white p-6">
      <h4 className="uppercase">Extraction Status</h4>
      <div className="mt-4 flex items-center gap-4">
        <span className="text-gray-400">Status:</span>
        <ExtractionStatusBadge status={execStatus} />
      </div>

      {execStatus === CircuitExtractionExecutionStatus.DONE && (
        <div className="mt-6">
          <h4 className="uppercase">Generated Circuits</h4>
          {isLoading && (
            <div className="mt-4 flex justify-center">
              <Loader className="text-neutral-3" />
            </div>
          )}
          {!isLoading && generatedEntities.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {generatedEntities.map((entity) => (
                <div key={entity.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm text-gray-400">Circuit ID</div>
                  <div className="font-mono text-sm" style={{ color }}>
                    {entity.id}
                  </div>
                  {entity.type && (
                    <>
                      <div className="mt-2 text-sm text-gray-400">Type</div>
                      <div className="text-sm">{entity.type}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isLoading && generatedEntities.length === 0 && (
            <div className="mt-4 text-gray-400">No circuits generated yet.</div>
          )}
        </div>
      )}

      {execStatus === CircuitExtractionExecutionStatus.ERROR && (
        <div className="mt-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
            Extraction failed. Please check the logs or try again.
          </div>
        </div>
      )}

      {(!execStatus || execStatus === CircuitExtractionExecutionStatus.CREATED) && (
        <div className="mt-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-500">
            Select this configuration and click &quot;Launch extractions&quot; to start the
            extraction process.
          </div>
        </div>
      )}

      {(execStatus === CircuitExtractionExecutionStatus.PENDING ||
        execStatus === CircuitExtractionExecutionStatus.RUNNING) && (
        <div className="mt-6">
          <div className="flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-600">
            <LoadingOutlined />
            <span>Extraction is in progress. Status will update automatically.</span>
          </div>
        </div>
      )}
    </div>
  );
}
