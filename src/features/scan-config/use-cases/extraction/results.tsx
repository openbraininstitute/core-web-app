'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Checkbox } from 'antd';
import { useCallback, useMemo, useState } from 'react';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { Loader } from '@/components/loader';
import { WorkspaceSection } from '@/constants';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { ExtractionInOutFiles } from '@/features/scan-config/use-cases/extraction/in-out-files';
import { ExtractionConfigsLeftMenu } from '@/features/scan-config/use-cases/extraction/left-menu';
import { useLoadMoreOnInView } from '@/features/scan-config/use-load-more-on-in-view';
import { buildActivityStatusMap, findLatestExecutionForEntity } from '@/features/task';
import {
  usePaginatedTaskConfigsWithVisibleExecutions,
  useTaskLaunchMutation,
  useTaskRunner,
} from '@/features/task/hooks';
import { MiniDetailViewRenderer, MiniDetailViewTheme } from '@/ui/segments/mini-detail-view';
import { classNames } from '@/util/utils';

import type { CheckboxProps } from 'antd';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TTaskConfigMeta } from '@/entity-configuration/domain/extraction/extraction-campaign';

import styles from '@/features/scan-config/scan-config.module.css';

const EXTRACTION_LIST_PAGE_SIZE = 30;

type Props = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

export function ExtractionTab({ campaignId, virtualLabId, projectId }: Props) {
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [selectedConfigIds, setSelectedConfigIds] = useState<string[] | null>(null);
  const [activeConfig, setActiveConfig] = useState<ITaskConfig<TTaskConfigMeta> | null>(null);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);

  const { mutateAsync: runExtraction, isPending: runExtractionPending } = useTaskLaunchMutation({
    context,
    obiOneTaskType: ObiOneTaskTypeDict.CircuitExtraction,
    executionActivityType: TaskActivityType.CircuitExtractionExecution,
    notificationKey: 'extraction-config-error',
    failureMessage: 'We ran into a problem launching your extraction. Please try again later.',
    logTopic: 'Extraction',
  });

  const {
    configGenerationLoading,
    configGenerationIds,
    configsResponse,
    executionsResponse,
    executionsLoading,
  } = useTaskRunner<TTaskConfigMeta>({
    context,
    campaignId,
    configGenerationActivityType: TaskActivityType.CircuitExtractionConfigGeneration,
    executionActivityType: TaskActivityType.CircuitExtractionExecution,
    taskConfigType: TaskConfigType.CircuitExtractionConfig,
    pauseExecutionPolling: runExtractionPending,
  });

  const {
    configPageLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    visibleConfigs,
    visibleConfigIds,
    visibleExecutionsResponse,
    visibleExecutionsLoading,
  } = usePaginatedTaskConfigsWithVisibleExecutions<TTaskConfigMeta>({
    context,
    taskConfigType: TaskConfigType.CircuitExtractionConfig,
    executionActivityType: TaskActivityType.CircuitExtractionExecution,
    ids: configGenerationIds,
    pageSize: EXTRACTION_LIST_PAGE_SIZE,
  });

  const loadMoreRef = useLoadMoreOnInView({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  const statusMap = useMemo(() => {
    return buildActivityStatusMap({
      entityIds: configsResponse?.configIds ?? [],
      executions: executionsResponse?.data ?? [],
    });
  }, [configsResponse?.configIds, executionsResponse?.data]);

  const visibleStatusMap = useMemo(() => {
    return buildActivityStatusMap({
      entityIds: visibleConfigIds,
      executions: visibleExecutionsResponse?.data ?? [],
    });
  }, [visibleConfigIds, visibleExecutionsResponse?.data]);

  const resolvedActiveConfig = activeConfig ?? visibleConfigs[0] ?? null;

  const activeConfigExecution = useMemo(() => {
    if (!resolvedActiveConfig) return undefined;
    const executions = [
      ...(visibleExecutionsResponse?.data ?? []),
      ...(executionsResponse?.data ?? []),
    ];
    return findLatestExecutionForEntity(executions, resolvedActiveConfig.id);
  }, [resolvedActiveConfig, executionsResponse?.data, visibleExecutionsResponse?.data]);

  const activeConfigExecStatus = activeConfigExecution?.status;

  const onActiveConfigChange = useCallback((config: ITaskConfig<TTaskConfigMeta>) => {
    setActiveConfig(config);
  }, []);

  const onSelectedForExtractionChange = useCallback((configId: string, selected: boolean) => {
    if (selected) {
      setSelectedConfigIds((prev) => [...(prev ?? []), configId]);
    } else {
      setSelectedConfigIds((prev) => (prev ?? []).filter((id) => id !== configId));
    }
  }, []);

  const selectableConfigIds = useMemo(() => {
    return (
      (configsResponse?.configList ?? [])
        .filter((config) => {
          const status = statusMap.get(config.id);
          return !status || status === ActivityStatus.CREATED || status === ActivityStatus.ERROR;
        })
        .map((c) => c.id) ?? []
    );
  }, [configsResponse?.configList, statusMap]);

  const resolvedSelectedConfigIds =
    selectedConfigIds ??
    (configsResponse?.configList && !executionsLoading ? selectableConfigIds : []);

  const onRun = async (configIdsToRun: string[]) => {
    await Promise.all(configIdsToRun.map((configId) => runExtraction(configId)));
    setSelectedConfigIds([]);
  };

  const onSelectedAll: CheckboxProps['onChange'] = (e) => {
    setSelectedConfigIds(e.target.checked ? selectableConfigIds : []);
  };

  const allSelected = useMemo(
    () =>
      selectableConfigIds.length > 0 &&
      selectableConfigIds.length === resolvedSelectedConfigIds.length,
    [selectableConfigIds, resolvedSelectedConfigIds]
  );

  const launchBtnLabelPrefix = resolvedSelectedConfigIds.length
    ? `(${resolvedSelectedConfigIds.length})`
    : '';
  const loading = configGenerationLoading || configPageLoading;

  return (
    <div className={styles.threeColumns}>
      <div className="border-r border-gray-200 pr-4">
        <div className="flex h-full flex-col gap-4 overflow-y-hidden">
          <Checkbox
            indeterminate={
              resolvedSelectedConfigIds.length > 0 &&
              resolvedSelectedConfigIds.length < selectableConfigIds.length
            }
            onChange={onSelectedAll}
            checked={allSelected}
            disabled={runExtractionPending || selectableConfigIds.length === 0}
          >
            Select all
          </Checkbox>
          <div className="flex grow flex-col justify-start gap-5 overflow-y-auto">
            {loading && (
              <div className="flex h-full items-center justify-center">
                <Loader className="text-neutral-3" />
              </div>
            )}
            {!loading && (
              <>
                {visibleConfigs.map((config) => (
                  <ExtractionConfigsLeftMenu
                    key={config.id}
                    selected={resolvedActiveConfig?.id === config.id}
                    config={config}
                    execStatus={visibleStatusMap.get(config.id) ?? statusMap.get(config.id)}
                    statusLoading={
                      visibleExecutionsLoading &&
                      !visibleStatusMap.has(config.id) &&
                      !statusMap.has(config.id)
                    }
                    onSelect={() => onActiveConfigChange(config)}
                    onSelectedForExtractionChange={onSelectedForExtractionChange}
                    selectedForExtraction={resolvedSelectedConfigIds.includes(config.id)}
                    selectionDisabled={runExtractionPending || visibleExecutionsLoading}
                  />
                ))}
                <div ref={loadMoreRef} className="flex min-h-8 items-center justify-center">
                  {isFetchingNextPage && <Loader size="small" className="text-neutral-3" />}
                </div>
              </>
            )}
          </div>
          <button
            className={classNames(
              'min-h-[50] w-full cursor-pointer rounded-3xl p-2 text-white',
              'bg-[linear-gradient(94.93deg,#389E0D_18.84%,#143805_116.7%)]',
              'disabled:cursor-not-allowed disabled:bg-gray-400 disabled:bg-none rounded-full'
            )}
            type="button"
            onClick={() => onRun(resolvedSelectedConfigIds)}
            disabled={runExtractionPending || resolvedSelectedConfigIds.length === 0}
          >
            <div className="flex justify-center gap-4">
              <span className="pl-10">Launch extractions {launchBtnLabelPrefix}</span>
              <div className="w-6">{runExtractionPending && <LoadingOutlined />}</div>
            </div>
          </button>
        </div>
      </div>

      <div className="relative border-r border-gray-200 px-4">
        {!!resolvedActiveConfig && (
          <ExtractionInOutFiles
            config={resolvedActiveConfig}
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
