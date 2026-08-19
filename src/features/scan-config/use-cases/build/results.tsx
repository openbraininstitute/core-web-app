'use client';

import { useMemo } from 'react';

import { ViewVariant, WorkspaceSection } from '@/constants';
import { useCostConfirmation } from '@/features/scan-config/components/cost-confirmation-modal';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ResultsLayout } from '@/features/scan-config/components/shared/results-layout';
import { TaskConfigSelectionList } from '@/features/scan-config/components/shared/task-config-selection-list';
import { TaskLaunchButton } from '@/features/scan-config/components/shared/task-launch-button';
import { useTaskTabState } from '@/features/scan-config/components/shared/use-task-tab-state';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';
import { InOutFiles } from '@/features/scan-config/use-cases/build/in-out-files';
import { TaskConfigurationViewer, TaskLogsViewer } from '@/features/task-logs-stream';
import { isTerminalActivityStatus } from '@/features/task-runner';
import { useTaskLaunchMutation } from '@/features/task-runner/hooks/mutations';
import { useTaskRunner } from '@/features/task-runner/hooks/queries';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import type { TWorkflowTaskTypeBindings } from '@/features/scan-config/workflow/types';

/** Campaign metadata shape shared by build workflows (only `scan_parameters` is read here). */
type TBuildCampaignMeta = { scan_parameters?: Record<string, unknown> };

type Props = {
  campaignId: string;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  isCampaignIdChanged: boolean;
  /** obi-one + entitycore task types for this build workflow (from its definition) */
  taskTypeBindings: TWorkflowTaskTypeBindings;
};

export function BuildTab({
  campaignOriginAction,
  campaignId,
  isCampaignIdChanged,
  taskTypeBindings,
}: Props) {
  const context = useWorkspace();

  const { mutateAsync: runBuild, isPending: runBuildPending } = useTaskLaunchMutation({
    context,
    obiOneTaskType: taskTypeBindings.obiOne,
    executionActivityType: taskTypeBindings.execution,
    notificationKey: 'build-config-error',
    failureMessage: 'We ran into a problem launching your build. Please try again later.',
    logTopic: 'Build',
  });

  const { configGenerationLoading, configsResponse, configsLoading } =
    useTaskRunner<TBuildCampaignMeta>({
      context,
      campaignId,
      configGenerationActivityType: taskTypeBindings.configGeneration,
      executionActivityType: taskTypeBindings.execution,
      taskConfigType: taskTypeBindings.config,
      pauseExecutionPolling: runBuildPending,
      loadExecutions: false,
    });

  const configs = useMemo(() => configsResponse?.configList ?? [], [configsResponse?.configList]);

  const {
    state: { activeConfig, selectedFile, executionByConfigId },
    act,
    selectableConfigIds,
    resolvedSelectedConfigIds,
  } = useTaskTabState<TBuildCampaignMeta>(campaignId, configs);

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
    await runBuild(configIdsToRun);
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
    workflowLabel: 'builds',
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
          <div className="flex h-full w-full flex-col gap-4 overflow-y-hidden">
            <TaskConfigSelectionList
              campaignId={campaignId}
              configs={configs}
              selectableConfigIds={selectableConfigIds}
              selectedConfigIds={resolvedSelectedConfigIds}
              activeConfigId={resolvedActiveConfig?.id}
              loading={loading}
              selectionDisabled={runBuildPending}
              fallbackColor="#389E0D"
              context={context}
              executionActivityType={taskTypeBindings.execution}
              pauseStatusPolling={runBuildPending}
              executionByConfigId={executionByConfigId}
              onSelectConfig={act.onActiveConfigChange}
              onCheckedChange={(configId, checked) =>
                act.onCheckedChange(configId, checked, resolvedSelectedConfigIds)
              }
              onToggleSelectAll={act.onToggleSelectAll}
              onExecutionLoad={act.onExecutionLoad}
            />
            <TaskLaunchButton
              label="Launch builds"
              countLabel={launchBtnLabelPrefix}
              pending={runBuildPending}
              disabled={runBuildPending || resolvedSelectedConfigIds.length === 0}
              onClick={openModal}
              className="rounded-full"
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
                campaignOrigin={campaignOriginAction}
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
                  record={selectedFile.entity as EntityCoreObjectTypes}
                  dataType={selectedFile.entity.type}
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
