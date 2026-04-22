'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { Checkbox } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { Loader } from '@/components/loader';
import { WorkspaceSection } from '@/constants';
import { FileViewer } from '@/features/scan-config/components/file-viewer';
import {
  buildActivityStatusMap,
  findLatestExecutionForEntity,
} from '@/features/scan-config/helpers';
import {
  useScanConfigLaunchMutation,
  useScanConfigTaskRunner,
} from '@/features/scan-config/task-runner';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { InOutFiles } from '@/features/scan-config/use-cases/build/in-out-files';
import { ConfigsLeftMenu } from '@/features/scan-config/use-cases/build/left-menu';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';
import { MiniDetailViewTheme } from '@/ui/segments/mini-detail-view/types';
import { classNames } from '@/util/utils';

import type { CheckboxProps } from 'antd';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';

import styles from '@/features/scan-config/scan-config.module.css';

type Props = {
  campaignId: string;
  virtualLabId: string;
  projectId: string;
};

export function BuildTab({ campaignId, virtualLabId, projectId }: Props) {
  const context = useMemo(() => ({ virtualLabId, projectId }), [projectId, virtualLabId]);

  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [activeConfig, setActiveConfig] = useState<ITaskConfig<never> | null>(null);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const [selectedFile, setSelectedFile] = useState<TActivityCustomFile | undefined>(undefined);

  const { mutateAsync: runBuild, isPending: runBuildPending } = useScanConfigLaunchMutation({
    context,
    obiOneTaskType: ObiOneTaskTypeDict.EmSynapseMapping,
    executionActivityType: TaskActivityType.EmSynapseMappingExecution,
    notificationKey: 'build-config-error',
    failureMessage: 'We ran into a problem launching your build. Please try again later.',
    logTopic: 'Build',
  });

  const {
    configGenerationLoading,
    configsResponse,
    configsLoading,
    executionsResponse,
    executionsLoading,
  } = useScanConfigTaskRunner<never>({
    context,
    campaignId,
    configGenerationActivityType: TaskActivityType.EmSynapseMappingConfigGeneration,
    executionActivityType: TaskActivityType.EmSynapseMappingExecution,
    taskConfigType: TaskConfigType.EmSynapseMappingConfig,
    pauseExecutionPolling: runBuildPending,
  });

  const statusMap = useMemo(() => {
    return buildActivityStatusMap({
      entityIds: configsResponse?.configIds ?? [],
      executions: executionsResponse?.data ?? [],
    });
  }, [configsResponse?.configIds, executionsResponse?.data]);

  const activeConfigExecution = useMemo(() => {
    if (!activeConfig) return undefined;
    const executions = executionsResponse?.data ?? [];
    return findLatestExecutionForEntity(executions, activeConfig.id);
  }, [activeConfig, executionsResponse?.data]);

  const activeConfigExecStatus = activeConfigExecution?.status;

  const onActiveConfigChange = useCallback((config: ITaskConfig<never>) => {
    setActiveConfig(config);
  }, []);

  const onSelectedForChange = useCallback((configId: string, selected: boolean) => {
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
    if (configsResponse?.configList && configsResponse.configList.length > 0 && !activeConfig) {
      onActiveConfigChange(configsResponse.configList[0]);
    }
  }, [configsResponse?.configList, activeConfig, onActiveConfigChange]);

  const onRun = async (configIdsToRun: string[]) => {
    for (const configId of configIdsToRun) {
      await runBuild(configId);
    }
    setSelectedConfigIds([]);
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
            disabled={runBuildPending || selectableConfigIds.length === 0}
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
              configsResponse?.configList?.map((config) => (
                <ConfigsLeftMenu
                  key={config.id}
                  selected={activeConfig?.id === config.id}
                  config={config}
                  execStatus={statusMap.get(config.id)}
                  onSelect={() => onActiveConfigChange(config)}
                  onSelectedForChange={onSelectedForChange}
                  selectedFor={selectedConfigIds.includes(config.id)}
                  selectionDisabled={runBuildPending}
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
            onClick={() => onRun(selectedConfigIds)}
            disabled={runBuildPending || selectedConfigIds.length === 0}
          >
            <div className="flex justify-center gap-4">
              <span className="pl-10">Launch builds {launchBtnLabelPrefix}</span>
              <div className="w-6">{runBuildPending && <LoadingOutlined />}</div>
            </div>
          </button>
        </div>
      </div>

      <div className="relative border-r border-gray-200 px-4">
        {!!activeConfig && (
          <InOutFiles
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
