'use client';

import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckboxProps } from 'antd';
import { Checkbox, ConfigProvider } from 'antd';
import { includes } from 'es-toolkit/compat';
import pMap from 'p-map';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCircuitExtractionConfig,
  getCircuitExtractionConfigGenerations,
  getCircuitExtractionExecutions,
} from '@/api/entitycore/queries/extraction';
import type { ICircuitExtractionConfig } from '@/api/entitycore/types/entities/circuit-extraction-config';
import type { ICircuitExtractionExecution } from '@/api/entitycore/types/entities/circuit-extraction-execution';
import {
  EntitycoreExecutionStatus,
  type EntitycoreUsedEntity,
  type TEntitycoreExecutionStatus,
} from '@/api/entitycore/types/entities/execution';
import { AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
import ApiError from '@/api/error';
import { launchExtraction, ObiOneTaskTypeDict } from '@/api/one/extraction';
import { Loader } from '@/components/loader';
import { useAppNotification } from '@/components/notification';
import {
  OfflineTokenConsentModal,
  useRunWithOfflineTokenConsent,
} from '@/features/offline-auth-management';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ScanParams } from '@/features/scan-config/components/scan-params';
import type { File } from '@/features/scan-config/components/simulation-files';
import errorRegistry from '@/features/scan-config/error-registry';
import styles from '@/features/scan-config/scan-config.module.css';
import { executionStatusColorMap } from '@/ui/segments/activity-execution/color-map';
import { classNames } from '@/util/utils';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

const STATUS_POLL_INTERVAL = 10_000; // 10 seconds
const EXTRACTION_ERROR_KEY = 'extraction-config-error';

type ExtractionTabProps = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

const queryKeys = {
  configGeneration: (campaignId: string, context: { virtualLabId: string; projectId: string }) =>
    ['extraction-config-generation', campaignId, context] as const,
  extractionConfigs: (configIds: string[], context: { virtualLabId: string; projectId: string }) =>
    ['extraction-configs', configIds, context] as const,
  extractionExecutions: (
    configIds: string[],
    context: { virtualLabId: string; projectId: string }
  ) => ['extraction-executions', configIds, context] as const,
};

export function ExtractionTab({ campaignId, virtualLabId, projectId }: ExtractionTabProps) {
  const queryClient = useQueryClient();
  const notification = useAppNotification();
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [extractionRequestInProgress, setExtractionRequestInProgress] = useState<boolean>(false);
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [activeConfig, setActiveConfig] = useState<ICircuitExtractionConfig | null>(null);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);

  const consentGate = useRunWithOfflineTokenConsent({
    notifyError: notification.error,
    messages: {
      denied: 'Consent declined. Extraction was not started.',
      timeout: 'Consent timed out. Please grant consent to run the extraction.',
    },
  });

  useEffect(() => {
    consentGate.prime();
  }, [consentGate.prime]);

  // 1. get the generation activity that used the campaign
  const { data: generationResponse, isLoading: generationLoading } = useQuery({
    queryKey: queryKeys.configGeneration(campaignId, context),
    queryFn: () =>
      getCircuitExtractionConfigGenerations({
        filters: { used__id: campaignId },
        context,
      }),
  });

  // 2. extract config IDs from the generation activity's "generated" field
  const generatedConfigIds = useMemo(() => {
    const generations = generationResponse?.data ?? [];
    const configIds: string[] = [];
    for (const generation of generations) {
      for (const generated of generation.generated ?? []) {
        if (generated.id) {
          configIds.push(generated.id);
        }
      }
    }
    return configIds;
  }, [generationResponse?.data]);

  // 3. fetch full config details for each generated config
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: queryKeys.extractionConfigs(generatedConfigIds, context),
    queryFn: async () => {
      const configPromises = generatedConfigIds.map((id) =>
        getCircuitExtractionConfig({ id, context })
      );
      return Promise.all(configPromises);
    },
    enabled: generatedConfigIds.length > 0,
  });

  const configList = configs ?? [];
  const configIds = configList.map((c) => c.id);
  const queryKey = queryKeys.extractionExecutions(configIds, context);

  const { data: executionsResponse, isLoading: executionsLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getCircuitExtractionExecutions({
        filters: { used__id__in: configIds },
        context,
      }),
    enabled: configIds.length > 0,
    refetchInterval: (query) => {
      const executions = query.state.data?.data ?? [];
      const hasActiveExtractions = executions.some((exec) =>
        includes(
          [EntitycoreExecutionStatus.PENDING, EntitycoreExecutionStatus.RUNNING],
          exec.status
        )
      );
      return hasActiveExtractions && !extractionRequestInProgress ? STATUS_POLL_INTERVAL : false;
    },
  });

  const statusMap = useMemo(() => {
    const map = new Map<string, TEntitycoreExecutionStatus>();
    const executions = executionsResponse?.data ?? [];

    for (const config of configList) {
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
  }, [configList, executionsResponse?.data]);

  const activeConfigExecution = useMemo(() => {
    if (!activeConfig) return undefined;
    const executions = executionsResponse?.data ?? [];
    const configExecutions = executions.filter((exec) =>
      exec.used?.some((used) => used.id === activeConfig.id)
    );
    if (configExecutions.length === 0) return undefined;
    return configExecutions.sort(
      (a, b) => new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime()
    )[0];
  }, [activeConfig, executionsResponse?.data]);

  const activeConfigExecStatus = activeConfigExecution?.status;

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
    return configList
      .filter((config) => {
        const status = statusMap.get(config.id);
        return (
          !status ||
          status === EntitycoreExecutionStatus.CREATED ||
          status === EntitycoreExecutionStatus.ERROR
        );
      })
      .map((c) => c.id);
  }, [configList, statusMap]);

  useEffect(() => {
    if (configList.length > 0 && !initialSelectionDone && !configsLoading && !executionsLoading) {
      setSelectedConfigIds(selectableConfigIds);
      setInitialSelectionDone(true);
    }
  }, [configList, configsLoading, executionsLoading, initialSelectionDone, selectableConfigIds]);

  useEffect(() => {
    if (configList.length > 0 && !activeConfig) {
      onActiveConfigChange(configList[0]);
    }
  }, [configList, activeConfig, onActiveConfigChange]);

  const launchExtractionMutation = useMutation({
    mutationFn: async (configId: string) => {
      return launchExtraction({
        ctx: { virtualLabId, projectId },
        task_type: ObiOneTaskTypeDict.CircuitExtraction,
        config_id: configId,
      });
    },
    throwOnError: false,
    onSuccess: (result, vars) => {
      log('info', `Extraction for ${vars} launched successfully, execution ID: ${result}`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.extractionExecutions(configIds, context),
      });
    },
    onError: (error, vars) => {
      log('error', `Failed to launch extraction for config ${vars}`, error);
      const defaultMsg = 'We ran into a problem launching your extraction. Please try again later.';
      if (error instanceof ApiError) {
        const code = error.cause?.code;
        const apiMessage = error.cause?.message ?? defaultMsg;

        // Only translate accounting/known codes. For everything else, show the API's message.
        const message = code ? getErrorMessage(code, errorRegistry, apiMessage) : apiMessage;
        notification.error({ message, duration: 5, key: EXTRACTION_ERROR_KEY });
        return;
      }

      notification.error({ message: defaultMsg, duration: 5, key: EXTRACTION_ERROR_KEY });
    },
  });

  const runExtraction = async (configIdsToRun: string[]) => {
    setExtractionRequestInProgress(true);

    try {
      await consentGate.runWithConsent(async () => {
        await pMap(configIdsToRun, (c) => launchExtractionMutation.mutateAsync(c), {
          concurrency: 3,
        });
        setSelectedConfigIds([]);
      });
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
  const loading = generationLoading || configsLoading || executionsLoading;

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
              configList.map((config) => (
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
            onMouseEnter={() => consentGate.prime()}
            onFocus={() => consentGate.prime()}
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
          <ExtractionFiles
            config={activeConfig}
            execStatus={activeConfigExecStatus}
            execution={activeConfigExecution}
            selectedFile={selectedFile}
            context={context}
            onSelect={setSelectedFile}
          />
        )}
      </div>

      <div className="relative pl-4">
        <FileViewer file={selectedFile} className="h-full" context={context} />
      </div>

      <OfflineTokenConsentModal
        open={consentGate.modal.open}
        consentUrl={consentGate.modal.consentUrl}
        onCancel={consentGate.cancel}
        onOpenConsent={() => {
          consentGate.openConsentLink(consentGate.modal.consentUrl);
        }}
      />
    </div>
  );
}

type ExtractionConfigListItemProps = {
  config: ICircuitExtractionConfig;
  execStatus?: TEntitycoreExecutionStatus;
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
    executionStatusColorMap[execStatus ?? EntitycoreExecutionStatus.CREATED] ?? '#8c8c8c';
  const isSelectable =
    !execStatus ||
    execStatus === EntitycoreExecutionStatus.CREATED ||
    execStatus === EntitycoreExecutionStatus.ERROR;

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

function ExtractionStatusBadge({ status }: { status?: TEntitycoreExecutionStatus }) {
  const color = status ? executionStatusColorMap[status as EntitycoreExecutionStatus] : '#fafafa';
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

type ExtractionFilesProps = {
  config: ICircuitExtractionConfig;
  execStatus?: TEntitycoreExecutionStatus;
  execution?: ICircuitExtractionExecution;
  selectedFile?: File;
  onSelect: (file: File) => void;
  context: { virtualLabId: string; projectId: string };
};

function ExtractionFiles({
  config,
  execStatus,
  execution,
  selectedFile,
  onSelect,
  context,
}: ExtractionFilesProps) {
  const { entity: circuit } = useModelQuery({ id: config.circuit_id, context });
  const extractionConfigAsset = config.assets.find(
    (o) => o.label === AssetLabel.circuit_extraction_config
  );
  const circuitAssets = circuit && 'assets' in circuit ? circuit.assets : [];
  const circuitConfigAsset = circuitAssets?.find(
    (o: IAsset) => o.label === AssetLabel.sonata_circuit
  );
  const inputFiles: File[] = useMemo(() => {
    const files: File[] = [];
    if (extractionConfigAsset) {
      files.push({
        entity: config,
        asset: extractionConfigAsset,
      });
    }
    if (circuit && circuitConfigAsset) {
      files.push({
        entity: circuit,
        asset: circuitConfigAsset,
        assetPath: 'circuit_config.json',
      });
    }
    return files;
  }, [config, circuit, circuitConfigAsset, extractionConfigAsset]);

  const outputAvailable =
    !!execStatus &&
    includes([EntitycoreExecutionStatus.ERROR, EntitycoreExecutionStatus.DONE], execStatus);

  // Use execution from props instead of making a duplicate request
  const outputFiles = useMemo(() => {
    const files: File[] = [];
    if (!execution) return files;

    const generatedEntities = (execution.generated ?? []) as EntitycoreUsedEntity[];

    for (const entity of generatedEntities) {
      const syntheticAsset = {
        id: entity.id,
        path: entity.name ?? entity.id,
        content_type: 'application/json',
        label: entity.type ?? 'circuit',
        full_path: entity.id,
        size: 0,
        is_lazy_loaded: false,
        status: 'done',
        bucket_name: '',
        is_directory: false,
        meta: null,
      } as unknown as IAsset;

      files.push({
        entity: entity as unknown as ICircuitExtractionConfig,
        asset: syntheticAsset,
        assetPath: entity.name ?? entity.id,
      });
    }

    return files;
  }, [execution]);

  useEffect(() => {
    if (inputFiles.length > 0 && !selectedFile) {
      onSelect(inputFiles[0]);
    }
  }, [inputFiles, selectedFile, onSelect]);

  return (
    <div className="h-full overflow-y-auto">
      <h4 className="uppercase">Input files</h4>
      <div className="mt-4 mb-8 flex flex-col gap-4">
        {inputFiles.length === 0 && <div className="text-gray-400">No input files available</div>}
        {inputFiles.map((file) => (
          <ExtractionFile
            selected={file.asset.id === selectedFile?.asset.id}
            key={file.asset.id}
            file={file}
            onSelect={onSelect}
          />
        ))}
      </div>

      {outputAvailable && (
        <>
          <h4 className="uppercase">Output files</h4>
          <div className="mt-4 flex flex-col gap-4">
            {outputFiles.length === 0 && (
              <div className="text-gray-400">No output files generated</div>
            )}
            {outputFiles.map((file) => (
              <ExtractionFile
                selected={file.asset.id === selectedFile?.asset.id}
                key={file.asset.id}
                file={file}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ExtractionFileProps = {
  file: File;
  selected?: boolean;
  onSelect: (file: File) => void;
};

function ExtractionFile({ file, selected, onSelect }: ExtractionFileProps) {
  const fileName = file.assetPath?.split('/').at(-1) ?? file.asset.path.split('/').at(-1);
  const fileExt = fileName?.split('.').at(-1);

  return (
    <button
      type="button"
      title={fileName}
      className={classNames(
        'flex w-full cursor-pointer items-center justify-between rounded-4xl p-4',
        selected ? 'bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]' : 'bg-white'
      )}
      onClick={() => onSelect(file)}
    >
      <span
        className={classNames(
          'truncate overflow-hidden font-semibold whitespace-nowrap',
          selected ? 'text-white' : 'text-primary-9'
        )}
      >
        {fileName}
      </span>
      <span
        className={classNames(
          'ml-4 shrink-0 rounded-2xl border px-4 uppercase',
          selected ? 'border-white text-white' : 'text-neutral-5 border-neutral-5'
        )}
      >
        {fileExt}
      </span>
    </button>
  );
}
