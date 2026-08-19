'use client';

import { useMemo } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ViewVariant, WorkspaceSection } from '@/constants';
import { useCostConfirmation } from '@/features/scan-config/components/cost-confirmation-modal';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ResultsLayout } from '@/features/scan-config/components/shared/results-layout';
import { TaskConfigSelectionList } from '@/features/scan-config/components/shared/task-config-selection-list';
import { TaskLaunchButton } from '@/features/scan-config/components/shared/task-launch-button';
import { useTaskTabState } from '@/features/scan-config/components/shared/use-task-tab-state';
import { ActivityCustomFileRenderer, ScanConfigActivity } from '@/features/scan-config/types';
import { TaskConfigurationViewer, TaskLogsViewer } from '@/features/task-logs-stream';
import { isTerminalActivityStatus } from '@/features/task-runner';
import { useTaskLaunchMutation } from '@/features/task-runner/hooks/mutations';
import { useTaskRunner } from '@/features/task-runner/hooks/queries';
import { messages as textMessages } from '@/i18n/en/scan-config';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import { InOutFiles } from './in-out-files';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { TSkeletonizationTaskConfigMeta } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import type { TWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';

type Props = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  isCampaignIdChanged: boolean;
  /** obi-one + entitycore task types for this workflow (from its definition) */
  taskTypeBindings: TWorkflowTaskTypeBindings;
};

export function SkeletonizationTab({
  campaignId,
  virtualLabId,
  projectId,
  campaignOriginAction,
  isCampaignIdChanged,
  taskTypeBindings,
}: Props) {
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const { mutateAsync: runSkeletonization, isPending: runSkeletonizationPending } =
    useTaskLaunchMutation({
      context,
      obiOneTaskType: taskTypeBindings.obiOne,
      executionActivityType: taskTypeBindings.execution,
      notificationKey: 'skeletonization-config-error',
      failureMessage: textMessages[ScanConfigActivity.Process].GenericFailed,
      logTopic: 'Skeletonization',
      requiresConsent: true,
    });

  const { configGenerationLoading, configsResponse, configsLoading } =
    useTaskRunner<TSkeletonizationTaskConfigMeta>({
      context,
      campaignId,
      configGenerationActivityType: taskTypeBindings.configGeneration,
      executionActivityType: taskTypeBindings.execution,
      taskConfigType: taskTypeBindings.config,
      pauseExecutionPolling: runSkeletonizationPending,
      loadExecutions: false,
    });

  const configs = useMemo(() => configsResponse?.configList ?? [], [configsResponse?.configList]);

  const {
    state: { activeConfig, selectedFile, executionByConfigId },
    act,
    selectableConfigIds,
    resolvedSelectedConfigIds,
  } = useTaskTabState<TSkeletonizationTaskConfigMeta>(campaignId, configs);

  const resolvedActiveConfig = activeConfig ?? configs[0] ?? null;

  const activeConfigExecution = useMemo(() => {
    if (!resolvedActiveConfig) return undefined;
    return executionByConfigId.get(resolvedActiveConfig.id) ?? undefined;
  }, [executionByConfigId, resolvedActiveConfig]);

  const activeConfigExecStatus = activeConfigExecution?.status;
  const activeExecutionJobId = activeConfigExecution?.execution_id ?? undefined;
  const taskLogsViewerEnabled = !!resolvedActiveConfig && !!activeExecutionJobId;
  const taskLogsShouldReadSnapshot =
    !!activeConfigExecStatus && isTerminalActivityStatus(activeConfigExecStatus);

  const onRun = async (configIdsToRun: string[]) => {
    await runSkeletonization(configIdsToRun);
    act.onLaunched();
  };

  const costModalItems = useMemo(
    () =>
      (configsResponse?.configList ?? [])
        .filter((c) => resolvedSelectedConfigIds.includes(c.id))
        .map((c) => ({ id: c.id, name: c.name })),
    [configsResponse?.configList, resolvedSelectedConfigIds]
  );

  const { openModal, modal: costConfirmationModal } = useCostConfirmation({
    items: costModalItems,
    taskType: taskTypeBindings.obiOne,
    workflowLabel: 'skeletonizations',
    context,
    onConfirm: onRun,
  });

  const launchBtnLabelPrefix = resolvedSelectedConfigIds.length
    ? `(${resolvedSelectedConfigIds.length})`
    : '';
  const loading = configGenerationLoading || configsLoading;

  return (
    <>
      <ResultsLayout
        campaignId={campaignId}
        left={
          <div className="flex h-full flex-col gap-4 overflow-y-hidden w-full">
            <TaskConfigSelectionList
              campaignId={campaignId}
              configs={configs}
              selectableConfigIds={selectableConfigIds}
              selectedConfigIds={resolvedSelectedConfigIds}
              activeConfigId={resolvedActiveConfig?.id}
              loading={loading}
              selectionDisabled={runSkeletonizationPending}
              fallbackColor="#8c8c8c"
              context={context}
              executionActivityType={taskTypeBindings.execution}
              pauseStatusPolling={runSkeletonizationPending}
              executionByConfigId={executionByConfigId}
              onSelectConfig={act.onActiveConfigChange}
              onCheckedChange={act.onCheckedChange}
              onToggleSelectAll={act.onToggleSelectAll}
              onExecutionLoad={act.onExecutionLoad}
            />
            <TaskLaunchButton
              label="Launch skeletonizations"
              countLabel={launchBtnLabelPrefix}
              pending={runSkeletonizationPending}
              disabled={runSkeletonizationPending || resolvedSelectedConfigIds.length === 0}
              onClick={openModal}
            />
          </div>
        }
        middle={
          !!resolvedActiveConfig && (
            <div className="h-full bg-background! w-full">
              <InOutFiles
                config={resolvedActiveConfig}
                execStatus={activeConfigExecStatus}
                execution={activeConfigExecution}
                selectedFile={selectedFile}
                context={context}
                onSelect={act.onSelectedFileChange}
              />
            </div>
          )
        }
        right={
          <>
            {selectedFile?.renderer === ActivityCustomFileRenderer.Default && (
              <FileViewer file={selectedFile} className="h-full w-full" context={context} />
            )}
            {selectedFile?.renderer === ActivityCustomFileRenderer.MiniDetailView && (
              <div className="h-full w-full">
                <MiniDetailViewRenderer
                  section={WorkspaceSection.Data}
                  record={selectedFile.entity as ICellMorphology}
                  dataType={EntityTypeDict.CellMorphology}
                  theme={ViewVariant.Light}
                  enableAnimation={false}
                />
              </div>
            )}
            {selectedFile?.renderer === ActivityCustomFileRenderer.TaskConfigurationViewer && (
              <TaskConfigurationViewer
                skipStream
                jobId={activeExecutionJobId}
                workspace={context}
                configId={resolvedActiveConfig?.id}
                enabled={taskLogsViewerEnabled}
                campaignOriginAction={campaignOriginAction}
                isCampaignIdChanged={isCampaignIdChanged}
              />
            )}
            {selectedFile?.renderer === ActivityCustomFileRenderer.TaskLogsViewer && (
              <TaskLogsViewer
                jobId={activeExecutionJobId}
                workspace={context}
                configId={resolvedActiveConfig?.id}
                enabled={taskLogsViewerEnabled}
                skipStream={taskLogsShouldReadSnapshot}
                campaignOriginAction={campaignOriginAction}
                isCampaignIdChanged={isCampaignIdChanged}
              />
            )}
          </>
        }
      />
      {costConfirmationModal}
    </>
  );
}
