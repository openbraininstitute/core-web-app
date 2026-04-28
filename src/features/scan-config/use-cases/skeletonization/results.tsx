'use client';

import { useCallback, useMemo, useState } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { WorkspaceSection } from '@/constants';
import { CostConfirmationModal } from '@/features/scan-config/components/cost-confirmation-modal';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ResultsLayout } from '@/features/scan-config/components/shared/results-layout';
import { TaskConfigSelectionList } from '@/features/scan-config/components/shared/task-config-selection-list';
import { TaskLaunchButton } from '@/features/scan-config/components/shared/task-launch-button';
import {
  ActivityCustomFileRenderer,
  ScanConfigActivity,
  type TActivityCustomFile,
} from '@/features/scan-config/types';
import { useTaskLaunchMutation } from '@/features/task-runner/hooks/mutations';
import { useTaskRunner } from '@/features/task-runner/hooks/queries';
import { messages as textMessages } from '@/i18n/en/scan-config';
import { MiniDetailViewRenderer, MiniDetailViewTheme } from '@/ui/segments/mini-detail-view';

import { InOutFiles } from './in-out-files';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { TSkeletonizationTaskConfigMeta } from '@/entity-configuration/domain/processing/skeletonization-campaign';

type Props = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

export function SkeletonizationTab({ campaignId, virtualLabId, projectId }: Props) {
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [selectedConfigIds, setSelectedConfigIds] = useState<string[] | null>(null);
  const [activeConfig, setActiveConfig] =
    useState<ITaskConfig<TSkeletonizationTaskConfigMeta> | null>(null);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);
  const [showCostModal, setShowCostModal] = useState(false);
  const [executionByConfigId, setExecutionByConfigId] = useState<Map<string, ITaskActivity | null>>(
    new Map()
  );

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

  const { configGenerationLoading, configsResponse, configsLoading } =
    useTaskRunner<TSkeletonizationTaskConfigMeta>({
      context,
      campaignId,
      configGenerationActivityType: TaskActivityType.SkeletonizationConfigGeneration,
      executionActivityType: TaskActivityType.SkeletonizationExecution,
      taskConfigType: TaskConfigType.SkeletonizationConfig,
      pauseExecutionPolling: runSkeletonizationPending,
      loadExecutions: false,
    });

  const configs = configsResponse?.configList ?? [];

  const resolvedActiveConfig = activeConfig ?? configs[0] ?? null;

  const activeConfigExecution = useMemo(() => {
    if (!resolvedActiveConfig) return undefined;
    return executionByConfigId.get(resolvedActiveConfig.id) ?? undefined;
  }, [executionByConfigId, resolvedActiveConfig]);

  const activeConfigExecStatus = activeConfigExecution?.status;

  const onActiveConfigChange = useCallback(
    (config: ITaskConfig<TSkeletonizationTaskConfigMeta>) => {
      setActiveConfig(config);
    },
    []
  );

  const onSelectedForSkeletonizationChange = useCallback((configId: string, selected: boolean) => {
    if (selected) {
      setSelectedConfigIds((prev) => [...(prev ?? []), configId]);
    } else {
      setSelectedConfigIds((prev) => (prev ?? []).filter((id) => id !== configId));
    }
  }, []);

  const onExecutionLoad = useCallback((configId: string, execution: ITaskActivity | null) => {
    setExecutionByConfigId((prev) => {
      if (prev.get(configId) === execution) return prev;
      return new Map(prev).set(configId, execution);
    });
  }, []);

  const selectableConfigIds = useMemo(() => {
    return (
      (configsResponse?.configList ?? [])
        .filter((config) => {
          if (!executionByConfigId.has(config.id)) return false;
          const status = executionByConfigId.get(config.id)?.status;
          return !status || status === ActivityStatus.CREATED || status === ActivityStatus.ERROR;
        })
        .map((c) => c.id) ?? []
    );
  }, [configsResponse?.configList, executionByConfigId]);

  const allConfigStatusesLoaded =
    configs.length > 0 && configs.every((config) => executionByConfigId.has(config.id));

  const resolvedSelectedConfigIds =
    selectedConfigIds ?? (allConfigStatusesLoaded ? selectableConfigIds : []);

  const onRun = async (configIdsToRun: string[]) => {
    await runSkeletonization(configIdsToRun);
    setSelectedConfigIds([]);
  };

  const costModalItems = useMemo(
    () =>
      (configsResponse?.configList ?? [])
        .filter((c) => resolvedSelectedConfigIds.includes(c.id))
        .map((c) => ({ id: c.id, name: c.name })),
    [configsResponse?.configList, resolvedSelectedConfigIds]
  );

  const onCostConfirm = (confirmedIds: string[]) => {
    setShowCostModal(false);
    onRun(confirmedIds);
  };

  const launchBtnLabelPrefix = resolvedSelectedConfigIds.length
    ? `(${resolvedSelectedConfigIds.length})`
    : '';
  const loading = configGenerationLoading || configsLoading;

  return (
    <>
      <ResultsLayout
        campaignId={campaignId}
        left={
          <div className="flex h-full flex-col gap-4 overflow-y-hidden">
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
              executionActivityType={TaskActivityType.SkeletonizationExecution}
              pauseStatusPolling={runSkeletonizationPending}
              executionByConfigId={executionByConfigId}
              onSelectConfig={onActiveConfigChange}
              onCheckedChange={onSelectedForSkeletonizationChange}
              onToggleSelectAll={(checked) =>
                setSelectedConfigIds(checked ? selectableConfigIds : [])
              }
              onExecutionLoad={onExecutionLoad}
            />
            <TaskLaunchButton
              label="Launch skeletonizations"
              countLabel={launchBtnLabelPrefix}
              pending={runSkeletonizationPending}
              disabled={runSkeletonizationPending || resolvedSelectedConfigIds.length === 0}
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
