'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from 'antd';
import { includes } from 'es-toolkit/compat';
import pMap from 'p-map';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getTaskActivities, getTaskConfigs } from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ApiError } from '@/api/error';
import { launchExtraction } from '@/api/one/extraction';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { Loader } from '@/components/loader';
import { useAppNotification } from '@/components/notification';
import { WorkspaceSection } from '@/constants';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { errorRegistry } from '@/features/scan-config/error-registry';
import {
  buildActivityStatusMap,
  findLatestExecutionForEntity,
} from '@/features/scan-config/helpers';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { ExtractionInOutFiles } from '@/features/scan-config/use-cases/extraction/in-out-files';
import { ExtractionConfigsLeftMenu } from '@/features/scan-config/use-cases/extraction/left-menu';
import { MiniDetailViewRenderer, MiniDetailViewTheme } from '@/ui/segments/mini-detail-view';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { classNames } from '@/util/utils';
import { getErrorMessage } from '@/utils/error';
import { log } from '@/utils/logger';

import type { CheckboxProps } from 'antd';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TTaskConfigMeta } from '@/entity-configuration/domain/extraction/extraction-campaign';

import styles from '@/features/scan-config/scan-config.module.css';

const STATUS_POLL_INTERVAL = 10_000; // 10 seconds
const EXTRACTION_ERROR_KEY = 'extraction-config-error';

type Props = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

export function ExtractionTab({ campaignId, virtualLabId, projectId }: Props) {
  const queryClient = useQueryClient();
  const notification = useAppNotification();
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [extractionRequestInProgress, setExtractionRequestInProgress] = useState<boolean>(false);
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [activeConfig, setActiveConfig] = useState<ITaskConfig<TTaskConfigMeta> | null>(null);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);

  // 1. get the generation activity that used the campaign
  const { data: configGenerationIds, isPending: configGenerationLoading } = useQuery({
    queryKey: keyBuilder.taskActivities({
      context,
      filters: {
        task_activity_type: TaskActivityType.CircuitExtractionConfigGeneration,
        used__id: campaignId,
      },
    }),
    queryFn: () =>
      getTaskActivities({
        filters: {
          task_activity_type: TaskActivityType.CircuitExtractionConfigGeneration,
          used__id: campaignId,
        },
        withFacets: false,
        context,
      }),
    select: (data) => data.data.at(0)?.generated?.map((g) => g.id) ?? [],
  });

  // 2. get the config generation activities
  const { data: taskConfigs, isLoading: configsLoading } = useQuery({
    queryKey: keyBuilder.taskConfigs({
      context,
      filters: {
        task_config_type: TaskConfigType.CircuitExtractionConfig,
        id__in: configGenerationIds,
      },
    }),
    queryFn: () =>
      getTaskConfigs<TTaskConfigMeta>({
        filters: {
          task_config_type: TaskConfigType.CircuitExtractionConfig,
          id__in: configGenerationIds,
        },
        withFacets: false,
        context,
      }),
    enabled: configGenerationIds && configGenerationIds.length > 0,
    select: (data) => data.data,
  });

  const configList = useMemo(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return [...(taskConfigs ?? [])].sort((a, b) => collator.compare(a.name, b.name));
  }, [taskConfigs]);

  const configIds = configList.map((c) => c.id);
  // 3. get the execution activities
  const { data: executionsResponse, isLoading: executionsLoading } = useQuery({
    queryKey: keyBuilder.taskActivities({
      context,
      filters: {
        task_activity_type: TaskActivityType.CircuitExtractionExecution,
        used__id__in: configIds,
      },
    }),
    queryFn: () =>
      getTaskActivities({
        filters: {
          task_activity_type: TaskActivityType.CircuitExtractionExecution,
          used__id__in: configIds,
        },
        context,
      }),
    enabled: configIds.length > 0,
    refetchInterval: (query) => {
      const executions = query.state.data?.data ?? [];
      const hasActiveExtractions = executions.some((exec) =>
        includes([ActivityStatus.PENDING, ActivityStatus.RUNNING], exec.status)
      );
      return hasActiveExtractions && !extractionRequestInProgress ? STATUS_POLL_INTERVAL : false;
    },
  });

  const statusMap = useMemo(() => {
    return buildActivityStatusMap({
      entityIds: configList.map((c) => c.id),
      executions: executionsResponse?.data ?? [],
    });
  }, [configList, executionsResponse?.data]);

  const activeConfigExecution = useMemo(() => {
    if (!activeConfig) return undefined;
    const executions = executionsResponse?.data ?? [];
    return findLatestExecutionForEntity(executions, activeConfig.id);
  }, [activeConfig, executionsResponse?.data]);

  const activeConfigExecStatus = activeConfigExecution?.status;

  const onActiveConfigChange = useCallback(
    (config: ITaskConfig<{ scan_parameters: Record<string, unknown> }>) => {
      setActiveConfig(config);
    },
    []
  );

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
        return !status || status === ActivityStatus.CREATED || status === ActivityStatus.ERROR;
      })
      .map((c) => c.id);
  }, [configList, statusMap]);

  useEffect(() => {
    if (configList.length > 0 && !initialSelectionDone && !executionsLoading) {
      setSelectedConfigIds(selectableConfigIds);
      setInitialSelectionDone(true);
    }
  }, [configList, executionsLoading, initialSelectionDone, selectableConfigIds]);

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
      log('info', `Extraction for ${vars} launched successfully, execution ID`, { result });
      queryClient.invalidateQueries({
        queryKey: keyBuilder.taskActivities({
          context,
          filters: {
            used__id__in: configIds,
          },
        }),
      });
    },
    onError: (error, vars) => {
      log('error', `Failed to launch extraction for config ${vars}`, error);
      const defaultMsg = 'We ran into a problem launching your extraction. Please try again later.';
      if (error instanceof ApiError) {
        const code = error.cause?.code;
        const apiMessage = error.cause?.message ?? defaultMsg;
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
      await pMap(configIdsToRun, (c) => launchExtractionMutation.mutateAsync(c), {
        concurrency: 3,
      });
      setSelectedConfigIds([]);
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
  const loading = configsLoading || configGenerationLoading || executionsLoading;

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
                <ExtractionConfigsLeftMenu
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
              'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:bg-none rounded-full'
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
          <ExtractionInOutFiles
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
              record={selectedFile.entity as ICircuit}
              dataType={ExtendedEntitiesTypeDict.Circuit}
              theme={MiniDetailViewTheme.Light}
              enableAnimation={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
