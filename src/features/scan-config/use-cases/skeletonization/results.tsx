'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { Loader } from '@/components/loader';
import { WorkspaceSection } from '@/constants';
import { CostConfirmationModal } from '@/features/scan-config/components/cost-confirmation-modal';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ResultsLayout } from '@/features/scan-config/components/shared/results-layout';
import { TaskConfigSelectionList } from '@/features/scan-config/components/shared/task-config-selection-list';
import { TaskLaunchButton } from '@/features/scan-config/components/shared/task-launch-button';
import {
  buildActivityStatusMap,
  findLatestExecutionForEntity,
} from '@/features/scan-config/helpers';
import {
  ActivityCustomFileRenderer,
  ScanConfigActivity,
  type TActivityCustomFile,
} from '@/features/scan-config/types';
import { useLoadMoreOnInView } from '@/features/scan-config/use-load-more-on-in-view';
import { useTaskLaunchMutation } from '@/features/task/hooks/mutations';
import {
  usePaginatedTaskConfigsWithVisibleExecutions,
  useTaskRunner,
} from '@/features/task/hooks/queries';
import { messages as textMessages } from '@/i18n/en/scan-config';
import { MiniDetailViewRenderer, MiniDetailViewTheme } from '@/ui/segments/mini-detail-view';

import { InOutFiles } from './in-out-files';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { TSkeletonizationTaskConfigMeta } from '@/entity-configuration/domain/processing/skeletonization-campaign';

const SKELETONIZATION_LIST_PAGE_SIZE = 30;

type Props = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

export function SkeletonizationTab({ campaignId, virtualLabId, projectId }: Props) {
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [activeConfig, setActiveConfig] =
    useState<ITaskConfig<TSkeletonizationTaskConfigMeta> | null>(null);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);
  const [showCostModal, setShowCostModal] = useState(false);

  const { mutateAsync: runSkeletonization, isPending: runSkeletonizationPending } =
    useTaskLaunchMutation({
      context,
      obiOneTaskType: ObiOneTaskTypeDict.Skeletonization,
      executionActivityType: TaskActivityType.SkeletonizationExecution,
      notificationKey: 'skeletonization-config-error',
      failureMessage: textMessages[ScanConfigActivity.Process].GenericFailed,
      logTopic: 'Skeletonization',
      requiresConsent: true,
    });

  const {
    configGenerationLoading,
    configGenerationIds,
    configsResponse,
    executionsResponse,
    executionsLoading,
  } = useTaskRunner<TSkeletonizationTaskConfigMeta>({
    context,
    campaignId,
    configGenerationActivityType: TaskActivityType.SkeletonizationConfigGeneration,
    executionActivityType: TaskActivityType.SkeletonizationExecution,
    taskConfigType: TaskConfigType.SkeletonizationConfig,
    pauseExecutionPolling: runSkeletonizationPending,
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
  } = usePaginatedTaskConfigsWithVisibleExecutions<TSkeletonizationTaskConfigMeta>({
    context,
    taskConfigType: TaskConfigType.SkeletonizationConfig,
    executionActivityType: TaskActivityType.SkeletonizationExecution,
    ids: configGenerationIds,
    pageSize: SKELETONIZATION_LIST_PAGE_SIZE,
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

  const onActiveConfigChange = useCallback(
    (config: ITaskConfig<TSkeletonizationTaskConfigMeta>) => {
      setActiveConfig(config);
    },
    []
  );

  const onSelectedForSkeletonizationChange = useCallback((configId: string, selected: boolean) => {
    if (selected) {
      setSelectedConfigIds((prev) => [...prev, configId]);
    } else {
      setSelectedConfigIds((prev) => prev.filter((id) => id !== configId));
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

  useEffect(() => {
    if (
      configsResponse?.configList &&
      configsResponse.configList.length > 0 &&
      !initialSelectionDone &&
      !executionsLoading
    ) {
      setSelectedConfigIds(selectableConfigIds);
      setInitialSelectionDone(true);
    }
  }, [configsResponse?.configList, executionsLoading, initialSelectionDone, selectableConfigIds]);

  useEffect(() => {
    if (visibleConfigs.length > 0 && !activeConfig) {
      onActiveConfigChange(visibleConfigs[0]);
    }
  }, [visibleConfigs, activeConfig, onActiveConfigChange]);

  const onRun = async (configIdsToRun: string[]) => {
    await runSkeletonization(configIdsToRun);
    setSelectedConfigIds([]);
  };

  const costModalItems = useMemo(
    () =>
      (configsResponse?.configList ?? [])
        .filter((c) => selectedConfigIds.includes(c.id))
        .map((c) => ({ id: c.id, name: c.name })),
    [configsResponse?.configList, selectedConfigIds]
  );

  const onCostConfirm = (confirmedIds: string[]) => {
    setShowCostModal(false);
    onRun(confirmedIds);
  };

  const launchBtnLabelPrefix = selectedConfigIds.length ? `(${selectedConfigIds.length})` : '';
  const loading = configGenerationLoading || configPageLoading;

  return (
    <>
      <ResultsLayout
        campaignId={campaignId}
        left={
          <div className="flex h-full flex-col gap-4 overflow-y-hidden">
            <TaskConfigSelectionList
              configs={visibleConfigs}
              selectableConfigIds={selectableConfigIds}
              selectedConfigIds={selectedConfigIds}
              activeConfigId={resolvedActiveConfig?.id}
              loading={loading}
              selectionDisabled={runSkeletonizationPending}
              statusLoading={visibleExecutionsLoading}
              fallbackColor="#8c8c8c"
              visibleStatusMap={visibleStatusMap}
              statusMap={statusMap}
              onSelectConfig={onActiveConfigChange}
              onCheckedChange={onSelectedForSkeletonizationChange}
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
              label="Launch skeletonizations"
              countLabel={launchBtnLabelPrefix}
              pending={runSkeletonizationPending}
              disabled={runSkeletonizationPending || selectedConfigIds.length === 0}
              onClick={() => setShowCostModal(true)}
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
                  record={selectedFile.entity as ICellMorphology}
                  dataType={EntityTypeDict.CellMorphology}
                  theme={MiniDetailViewTheme.Light}
                  enableAnimation={false}
                />
              </div>
            )}
          </>
        }
      />
      <CostConfirmationModal
        open={showCostModal}
        onClose={() => setShowCostModal(false)}
        onConfirm={onCostConfirm}
        items={costModalItems}
        taskType={ObiOneTaskTypeDict.Skeletonization}
        workflowLabel="skeletonizations"
        context={context}
      />
    </>
  );
}
