'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from 'antd';
import { includes } from 'es-toolkit/compat';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getSkeletonizationConfig,
  getSkeletonizationConfigGenerations,
  getSkeletonizationExecutions,
} from '@/api/entitycore/queries/processing/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ApiError } from '@/api/error';
import { runBatch } from '@/api/small-scale-simulator/em-cell-mesh/skeletonization';
import { Loader } from '@/components/loader';
import { useAppNotification } from '@/components/notification';
import { WorkspaceSection } from '@/constants';
import {
  OfflineTokenConsentModal,
  useRunWithOfflineTokenConsent,
} from '@/features/offline-auth-management';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { SkeletonizationInOutFiles } from '@/features/scan-config/use-cases/skeletonization/in-out-files';
import { SkeletonizationConfigsLeftMenu } from '@/features/scan-config/use-cases/skeletonization/left-menu';
import { MiniDetailViewRenderer, MiniDetailViewTheme } from '@/ui/segments/mini-detail-view';
import { classNames } from '@/util/utils';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

import type { CheckboxProps } from 'antd';
import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { ISkeletonizationConfig } from '@/api/entitycore/types/entities/skeletonization-config';

import styles from '@/features/scan-config/scan-config.module.css';

const STATUS_POLL_INTERVAL = 20_000;
const SKELETONIZATION_ERROR_KEY = 'skeletonization-config-error';

const errorRegistry = {
  AUTH_CONSENT_CANCELLED: 'Skeletonization cancelled by user',
  AUTH_CONSENT_DENIED: 'Skeletonization consent denied',
  AUTH_CONSENT_TIMEOUT: 'Skeletonization consent timeout',
};

type Props = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

const queryKeys = {
  configGeneration: (campaignId: string, context: { virtualLabId: string; projectId: string }) =>
    ['skeletonization-config-generation', campaignId, context] as const,
  skeletonizationConfigs: (
    configIds: string[],
    context: { virtualLabId: string; projectId: string }
  ) => ['skeletonization-configs', configIds, context] as const,
  skeletonizationExecutions: (
    configIds: string[],
    context: { virtualLabId: string; projectId: string }
  ) => ['skeletonization-executions', configIds, context] as const,
};

export function SkeletonizationTab({ campaignId, virtualLabId, projectId }: Props) {
  const queryClient = useQueryClient();
  const notification = useAppNotification();
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [skeletonizationRequestInProgress, setSkeletonizationRequestInProgress] =
    useState<boolean>(false);
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [activeConfig, setActiveConfig] = useState<ISkeletonizationConfig | null>(null);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);

  const consentGate = useRunWithOfflineTokenConsent({
    notifyError: notification.error,
    messages: {
      cancelled: errorRegistry.AUTH_CONSENT_CANCELLED,
      denied: errorRegistry.AUTH_CONSENT_DENIED,
      timeout: errorRegistry.AUTH_CONSENT_TIMEOUT,
    },
    useCache: false,
  });

  useEffect(() => {
    consentGate.prime();
  }, [consentGate.prime]);

  const { data: generationResponse, isLoading: generationLoading } = useQuery({
    queryKey: queryKeys.configGeneration(campaignId, context),
    queryFn: () =>
      getSkeletonizationConfigGenerations({
        filters: { used__id: campaignId },
        withFacets: false,
        context,
      }),
  });

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

  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: queryKeys.skeletonizationConfigs(generatedConfigIds, context),
    queryFn: async () => {
      const configPromises = generatedConfigIds.map((id) =>
        getSkeletonizationConfig({ id, context })
      );
      return Promise.all(configPromises);
    },
    enabled: generatedConfigIds.length > 0,
  });

  const configList = configs ?? [];
  const configIds = configList.map((c) => c.id);
  const queryKey = queryKeys.skeletonizationExecutions(configIds, context);

  const { data: executionsResponse, isLoading: executionsLoading } = useQuery({
    queryKey,
    queryFn: () =>
      getSkeletonizationExecutions({
        filters: { used__id__in: configIds },
        context,
      }),
    enabled: configIds.length > 0,
    refetchInterval: (query) => {
      const executions = query.state.data?.data ?? [];
      const hasActiveSkeletonizations = executions.some((exec) =>
        includes([ActivityStatus.PENDING, ActivityStatus.RUNNING], exec.status)
      );
      return hasActiveSkeletonizations && !skeletonizationRequestInProgress
        ? STATUS_POLL_INTERVAL
        : false;
    },
  });

  const statusMap = useMemo(() => {
    const map = new Map<string, TActivityStatus>();
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

  const onActiveConfigChange = useCallback((config: ISkeletonizationConfig) => {
    setActiveConfig(config);
  }, []);

  const onSelectedForSkeletonizationChange = useCallback((configId: string, selected: boolean) => {
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
        return !status || status === ActivityStatus.CREATED || status === ActivityStatus.ERROR;
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

  const runSkeletonization = async (configIdsToRun: string[]) => {
    setSkeletonizationRequestInProgress(true);
    try {
      await consentGate.runWithConsent({
        fn: async () => {
          await runBatch({
            ctx: { virtualLabId, projectId },
            skeletonizationIds: configIdsToRun,
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.skeletonizationExecutions(configIds, context),
          });
          setSelectedConfigIds([]);
        },
      });
    } catch (error) {
      log('error', 'Failed to launch skeletonization batch', error);
      const defaultMsg =
        'We ran into a problem launching your skeletonization(s). Please try again later.';
      if (error instanceof ApiError) {
        const code = error.cause?.code;
        const apiMessage = error.cause?.message ?? defaultMsg;
        const message = code ? getErrorMessage(code, errorRegistry, apiMessage) : apiMessage;
        notification.error({ message, duration: 5, key: SKELETONIZATION_ERROR_KEY });
      } else {
        notification.error({ message: defaultMsg, duration: 5, key: SKELETONIZATION_ERROR_KEY });
      }
    } finally {
      setSkeletonizationRequestInProgress(false);
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
            disabled={skeletonizationRequestInProgress || selectableConfigIds.length === 0}
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
                <SkeletonizationConfigsLeftMenu
                  key={config.id}
                  selected={activeConfig?.id === config.id}
                  config={config}
                  execStatus={statusMap.get(config.id)}
                  onSelect={() => onActiveConfigChange(config)}
                  onSelectedForSkeletonizationChange={onSelectedForSkeletonizationChange}
                  selectedForSkeletonization={selectedConfigIds.includes(config.id)}
                  selectionDisabled={skeletonizationRequestInProgress}
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
            onClick={() => runSkeletonization(selectedConfigIds)}
            disabled={skeletonizationRequestInProgress || selectedConfigIds.length === 0}
          >
            <div className="flex justify-center gap-4">
              <span className="pl-10">Launch skeletonizations {launchBtnLabelPrefix}</span>
              <div className="w-6">{skeletonizationRequestInProgress && <LoadingOutlined />}</div>
            </div>
          </button>
        </div>
      </div>

      <div className="relative border-r border-gray-200 px-4">
        {!!activeConfig && (
          <SkeletonizationInOutFiles
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
        {selectedFile?.renderer === ActivityCustomFileRenderer.Default && (
          <FileViewer file={selectedFile} className="h-full" context={context} />
        )}
        {selectedFile?.renderer === ActivityCustomFileRenderer.MiniDetailView && (
          <div className="h-full">
            <MiniDetailViewRenderer
              section={WorkspaceSection.Data}
              record={selectedFile.entity as ICellMorphology}
              dataType={EntityTypeDict.CellMorphology}
              theme={MiniDetailViewTheme.Light}
              enableAnimation={false}
            />
          </div>
        )}
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
