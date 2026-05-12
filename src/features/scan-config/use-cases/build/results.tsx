'use client';

import { useCallback, useMemo, useState } from 'react';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { WorkspaceSection } from '@/constants';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import { ResultsLayout } from '@/features/scan-config/components/shared/results-layout';
import { TaskConfigSelectionList } from '@/features/scan-config/components/shared/task-config-selection-list';
import { TaskLaunchButton } from '@/features/scan-config/components/shared/task-launch-button';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { InOutFiles } from '@/features/scan-config/use-cases/build/in-out-files';
import { TaskConfigurationViewer, TaskLogsViewer } from '@/features/task-logs-stream';
import { useTaskLaunchMutation } from '@/features/task-runner/hooks/mutations';
import { useTaskRunner } from '@/features/task-runner/hooks/queries';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';
import { MiniDetailViewTheme } from '@/ui/segments/mini-detail-view/types';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TEmSynapseMappingCampaignMeta } from '@/entity-configuration/domain/model/em-synapse-mapping-campaign';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';

type Props = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
  campaignOriginAction: TScanConfigCampaignOriginActionDict;
  isCampaignIdChanged: boolean;
};

export function BuildTab({
  campaignOriginAction,
  campaignId,
  virtualLabId,
  projectId,
  isCampaignIdChanged,
}: Props) {
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [selectedConfigIds, setSelectedConfigIds] = useState<string[] | null>(null);
  const [activeConfig, setActiveConfig] =
    useState<ITaskConfig<TEmSynapseMappingCampaignMeta> | null>(null);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);
  const [executionByConfigId, setExecutionByConfigId] = useState<Map<string, ITaskActivity | null>>(
    new Map()
  );

  const { mutateAsync: runBuild, isPending: runBuildPending } = useTaskLaunchMutation({
    context,
    obiOneTaskType: ObiOneTaskTypeDict.EmSynapseMapping,
    executionActivityType: TaskActivityType.EmSynapseMappingExecution,
    notificationKey: 'build-config-error',
    failureMessage: 'We ran into a problem launching your build. Please try again later.',
    logTopic: 'Build',
  });

  const { configGenerationLoading, configsResponse, configsLoading } =
    useTaskRunner<TEmSynapseMappingCampaignMeta>({
      context,
      campaignId,
      configGenerationActivityType: TaskActivityType.EmSynapseMappingConfigGeneration,
      executionActivityType: TaskActivityType.EmSynapseMappingExecution,
      taskConfigType: TaskConfigType.EmSynapseMappingConfig,
      pauseExecutionPolling: runBuildPending,
      loadExecutions: false,
    });

  const configs = configsResponse?.configList ?? [];

  const resolvedActiveConfig = activeConfig ?? configs[0] ?? null;

  const activeConfigExecution = useMemo(() => {
    if (!resolvedActiveConfig) return undefined;
    return executionByConfigId.get(resolvedActiveConfig.id) ?? undefined;
  }, [executionByConfigId, resolvedActiveConfig]);

  const activeConfigExecStatus = activeConfigExecution?.status;
  const activeExecutionJobId = activeConfigExecution?.execution_id ?? undefined;
  const taskLogsViewerEnabled = !!resolvedActiveConfig && !!activeExecutionJobId;
  const taskLogsShouldReadSnapshot =
    !!activeConfigExecStatus &&
    [ActivityStatus.CANCELLED, ActivityStatus.DONE, ActivityStatus.ERROR].includes(
      activeConfigExecStatus
    );

  const onActiveConfigChange = useCallback((config: ITaskConfig<TEmSynapseMappingCampaignMeta>) => {
    setActiveConfig(config);
  }, []);

  const onSelectedForBuildChange = useCallback((configId: string, selected: boolean) => {
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
    await runBuild(configIdsToRun);
    setSelectedConfigIds([]);
  };

  const launchBtnLabelPrefix = resolvedSelectedConfigIds.length
    ? `(${resolvedSelectedConfigIds.length})`
    : '';
  const loading = configGenerationLoading || configsLoading;

  return (
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
            executionActivityType={TaskActivityType.EmSynapseMappingExecution}
            pauseStatusPolling={runBuildPending}
            executionByConfigId={executionByConfigId}
            onSelectConfig={onActiveConfigChange}
            onCheckedChange={onSelectedForBuildChange}
            onToggleSelectAll={(checked) =>
              setSelectedConfigIds(checked ? selectableConfigIds : [])
            }
            onExecutionLoad={onExecutionLoad}
          />
          <TaskLaunchButton
            label="Launch builds"
            countLabel={launchBtnLabelPrefix}
            pending={runBuildPending}
            disabled={runBuildPending || resolvedSelectedConfigIds.length === 0}
            onClick={() => onRun(resolvedSelectedConfigIds)}
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
              onSelect={setSelectedFile}
            />
          </div>
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
                dataType={ExtendedEntitiesTypeDict.MEModelWithSynapses}
                theme={MiniDetailViewTheme.Light}
                enableAnimation={false}
              />
            </div>
          )}
          {selectedFile?.renderer === ActivityCustomFileRenderer.TaskConfigurationViewer && (
            <TaskConfigurationViewer
              jobId={activeExecutionJobId}
              workspace={context}
              configId={resolvedActiveConfig?.id}
              enabled={taskLogsViewerEnabled}
              skipStream
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
  );
}
