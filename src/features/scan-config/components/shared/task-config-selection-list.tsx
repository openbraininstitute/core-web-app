import { useQueryClient } from '@tanstack/react-query';
import { Checkbox } from 'antd';
import { useEffect } from 'react';

import { TaskConfigSelectionCard } from '@/features/scan-config/components/shared/task-config-selection-card';
import { TASK_STATUS_QUERY_KEY_HEAD } from '@/features/task-runner';
import { useTaskConfigExecution } from '@/features/task-runner/hooks/queries';
import { cn } from '@/utils/css-class';

import type {
  ITaskActivity,
  TTaskActivityType,
} from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { WorkspaceContext } from '@/types/common';

type Props<TMeta extends Record<string, unknown>> = {
  campaignId: string;
  configs: ITaskConfig<TMeta>[];
  selectableConfigIds: string[];
  selectedConfigIds: string[];
  activeConfigId?: string;
  loading: boolean;
  selectionDisabled?: boolean;
  fallbackColor: string;
  context: WorkspaceContext;
  executionActivityType: TTaskActivityType;
  pauseStatusPolling?: boolean;
  executionByConfigId: Map<string, ITaskActivity | null>;
  onSelectConfig: (config: ITaskConfig<TMeta>) => void;
  onCheckedChange: (configId: string, selected: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onExecutionLoad: (configId: string, execution: ITaskActivity | null) => void;
};

type SelectAllCheckboxProps = {
  selectedCount: number;
  selectableCount: number;
  disabled?: boolean;
  onToggleSelectAll: (checked: boolean) => void;
};

export function SelectAllCheckbox({
  selectedCount,
  selectableCount,
  disabled,
  onToggleSelectAll,
}: SelectAllCheckboxProps) {
  const allSelected = selectableCount > 0 && selectableCount === selectedCount;
  const partiallySelected = selectedCount > 0 && selectedCount < selectableCount;

  return (
    <Checkbox
      indeterminate={partiallySelected}
      onChange={(e) => onToggleSelectAll(e.target.checked)}
      checked={allSelected}
      disabled={disabled || selectableCount === 0}
      className={cn(
        'ml-4.5 [&_.ant-checkbox-checked_.ant-checkbox]:border-primary-6!',
        '[&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6!',
        '[&_.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!',
        '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6!',
        '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-6!',
        '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!'
      )}
    >
      Select all
    </Checkbox>
  );
}

export function TaskConfigSelectionList<TMeta extends Record<string, unknown>>({
  campaignId,
  configs,
  selectableConfigIds,
  selectedConfigIds,
  activeConfigId,
  loading,
  selectionDisabled,
  fallbackColor,
  context,
  executionActivityType,
  pauseStatusPolling,
  executionByConfigId,
  onSelectConfig,
  onCheckedChange,
  onToggleSelectAll,
  onExecutionLoad,
}: Props<TMeta>) {
  return (
    <>
      <SelectAllCheckbox
        selectedCount={selectedConfigIds.length}
        selectableCount={selectableConfigIds.length}
        disabled={selectionDisabled}
        onToggleSelectAll={onToggleSelectAll}
      />
      <div className="flex grow flex-col justify-start gap-2 overflow-y-auto">
        {loading && <div className="flex h-full items-center justify-center" />}
        {!loading &&
          configs.map((config) => (
            <TaskConfigSelectionCardWithStatus
              key={config.id}
              campaignId={campaignId}
              context={context}
              executionActivityType={executionActivityType}
              pauseStatusPolling={pauseStatusPolling}
              selected={activeConfigId === config.id}
              config={config}
              fallbackExecution={executionByConfigId.get(config.id)}
              onSelect={() => onSelectConfig(config)}
              onCheckedChange={onCheckedChange}
              isChecked={selectedConfigIds.includes(config.id)}
              selectionDisabled={selectionDisabled}
              fallbackColor={fallbackColor}
              onExecutionLoad={onExecutionLoad}
            />
          ))}
      </div>
    </>
  );
}

type TaskConfigSelectionCardWithStatusProps<TMeta extends Record<string, unknown>> = {
  campaignId: string;
  context: WorkspaceContext;
  executionActivityType: TTaskActivityType;
  pauseStatusPolling?: boolean;
  config: ITaskConfig<TMeta>;
  fallbackExecution?: ITaskActivity | null;
  selected?: boolean;
  isChecked: boolean;
  selectionDisabled?: boolean;
  fallbackColor: string;
  onSelect: () => void;
  onCheckedChange: (configId: string, selected: boolean) => void;
  onExecutionLoad: (configId: string, execution: ITaskActivity | null) => void;
};

function TaskConfigSelectionCardWithStatus<TMeta extends Record<string, unknown>>({
  campaignId,
  context,
  executionActivityType,
  pauseStatusPolling,
  config,
  fallbackExecution,
  selected,
  isChecked,
  selectionDisabled,
  fallbackColor,
  onSelect,
  onCheckedChange,
  onExecutionLoad,
}: TaskConfigSelectionCardWithStatusProps<TMeta>) {
  const queryClient = useQueryClient();
  const { data: execution, isLoading } = useTaskConfigExecution({
    context,
    configId: config.id,
    executionActivityType,
    pausePolling: pauseStatusPolling,
    fallbackExecution,
  });

  useEffect(() => {
    if (execution !== undefined) {
      queryClient.invalidateQueries({
        queryKey: [TASK_STATUS_QUERY_KEY_HEAD, { campaignId, context }],
      });
      onExecutionLoad(config.id, execution);
    }
  }, [config.id, execution, onExecutionLoad, campaignId, context, queryClient.invalidateQueries]);

  const resolvedExecution = execution ?? fallbackExecution;
  const statusLoaded = execution !== undefined || fallbackExecution !== undefined;

  return (
    <TaskConfigSelectionCard
      selected={selected}
      configId={config.id}
      configName={config.name}
      scanParams={config.meta.scan_parameters as Record<string, string | number>}
      execStatus={resolvedExecution?.status}
      statusLoading={isLoading && !statusLoaded}
      onSelect={onSelect}
      onCheckedChange={onCheckedChange}
      isChecked={isChecked}
      selectionDisabled={selectionDisabled || (isLoading && !statusLoaded)}
      fallbackColor={fallbackColor}
    />
  );
}
