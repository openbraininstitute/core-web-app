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
import { InOutFiles } from '@/features/scan-config/use-cases/extraction/in-out-files';
import { useTaskLaunchMutation } from '@/features/task-runner/hooks/mutations';
import { useTaskRunner } from '@/features/task-runner/hooks/queries';
import { MiniDetailViewRenderer, MiniDetailViewTheme } from '@/ui/segments/mini-detail-view';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TTaskConfigMeta } from '@/entity-configuration/domain/extraction/extraction-campaign';

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
  const [executionByConfigId, setExecutionByConfigId] = useState<Map<string, ITaskActivity | null>>(
    new Map()
  );

  const { mutateAsync: runExtraction, isPending: runExtractionPending } = useTaskLaunchMutation({
    context,
    obiOneTaskType: ObiOneTaskTypeDict.CircuitExtraction,
    executionActivityType: TaskActivityType.CircuitExtractionExecution,
    notificationKey: 'extraction-config-error',
    failureMessage: 'We ran into a problem launching your extraction. Please try again later.',
    logTopic: 'Extraction',
  });

  const { configGenerationLoading, configsResponse, configsLoading } =
    useTaskRunner<TTaskConfigMeta>({
      context,
      campaignId,
      configGenerationActivityType: TaskActivityType.CircuitExtractionConfigGeneration,
      executionActivityType: TaskActivityType.CircuitExtractionExecution,
      taskConfigType: TaskConfigType.CircuitExtractionConfig,
      pauseExecutionPolling: runExtractionPending,
      loadExecutions: false,
    });

  const configs = configsResponse?.configList ?? [];

  const resolvedActiveConfig = activeConfig ?? configs[0] ?? null;

  const activeConfigExecution = useMemo(() => {
    if (!resolvedActiveConfig) return undefined;
    return executionByConfigId.get(resolvedActiveConfig.id) ?? undefined;
  }, [executionByConfigId, resolvedActiveConfig]);

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
    await runExtraction(configIdsToRun);
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
            selectionDisabled={runExtractionPending}
            fallbackColor="#004793"
            context={context}
            executionActivityType={TaskActivityType.CircuitExtractionExecution}
            pauseStatusPolling={runExtractionPending}
            executionByConfigId={executionByConfigId}
            onSelectConfig={onActiveConfigChange}
            onCheckedChange={onSelectedForExtractionChange}
            onToggleSelectAll={(checked) =>
              setSelectedConfigIds(checked ? selectableConfigIds : [])
            }
            onExecutionLoad={onExecutionLoad}
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
          <div className="h-full bg-background! w-full">
            <InOutFiles
              config={resolvedActiveConfig}
              execStatus={activeConfigExecStatus}
              execution={activeConfigExecution}
              selectedFile={selectedFile}
              context={context}
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
