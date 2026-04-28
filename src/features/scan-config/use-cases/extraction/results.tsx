'use client';

import { useCallback, useMemo, useState } from 'react';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { Loader } from '@/components/loader';
import { WorkspaceSection } from '@/constants';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ResultsLayout } from '@/features/scan-config/components/shared/results-layout';
import { TaskConfigSelectionList } from '@/features/scan-config/components/shared/task-config-selection-list';
import { TaskLaunchButton } from '@/features/scan-config/components/shared/task-launch-button';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { InOutFiles } from '@/features/scan-config/use-cases/extraction/in-out-files';
import { useLoadMoreOnInView } from '@/features/scan-config/use-load-more-on-in-view';
import { buildActivityStatusMap, findLatestExecutionForEntity } from '@/features/task-runner';
import { useTaskLaunchMutation } from '@/features/task-runner/hooks/mutations';
import {
  usePaginatedTaskConfigsWithVisibleExecutions,
  useTaskRunner,
} from '@/features/task-runner/hooks/queries';
import { MiniDetailViewRenderer, MiniDetailViewTheme } from '@/ui/segments/mini-detail-view';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TTaskConfigMeta } from '@/entity-configuration/domain/extraction/extraction-campaign';

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
    await runExtraction(configIdsToRun);
    setSelectedConfigIds([]);
  };

  const launchBtnLabelPrefix = resolvedSelectedConfigIds.length
    ? `(${resolvedSelectedConfigIds.length})`
    : '';
  const loading = configGenerationLoading || configPageLoading;

  return (
    <ResultsLayout
      campaignId={campaignId}
      left={
        <div className="flex h-full flex-col gap-4 overflow-y-hidden">
          <TaskConfigSelectionList
            configs={visibleConfigs}
            selectableConfigIds={selectableConfigIds}
            selectedConfigIds={resolvedSelectedConfigIds}
            activeConfigId={resolvedActiveConfig?.id}
            loading={loading}
            selectionDisabled={runExtractionPending}
            statusLoading={visibleExecutionsLoading}
            fallbackColor="#004793"
            visibleStatusMap={visibleStatusMap}
            statusMap={statusMap}
            onSelectConfig={onActiveConfigChange}
            onCheckedChange={onSelectedForExtractionChange}
            onToggleSelectAll={(checked) =>
              setSelectedConfigIds(checked ? selectableConfigIds : [])
            }
            loadingSlot={
              <div className="flex h-full items-center justify-center">
                <Loader className="text-neutral-3" />
              </div>
            }
            loadMoreSlot={
              <div ref={loadMoreRef} className="flex min-h-8 items-center justify-center">
                {isFetchingNextPage && <Loader size="small" className="text-neutral-3" />}
              </div>
            }
          />
          <TaskLaunchButton
            label="Launch extractions"
            countLabel={launchBtnLabelPrefix}
            pending={runExtractionPending}
            disabled={runExtractionPending || resolvedSelectedConfigIds.length === 0}
            onClick={() => onRun(resolvedSelectedConfigIds)}
            className="rounded-full"
          />
        </div>
      }
      middle={
        !!resolvedActiveConfig && (
          <InOutFiles
            config={resolvedActiveConfig}
            execStatus={activeConfigExecStatus}
            execution={activeConfigExecution}
            selectedFile={selectedFile}
            context={context}
            onSelect={setSelectedFile}
          />
        )
      }
      right={
        <>
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
        </>
      }
    />
  );
}
