import { Checkbox } from 'antd';

import { TaskConfigSelectionCard } from '@/features/scan-config/components/shared/task-config-selection-card';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TActivityStatus } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';

type Props<TMeta extends Record<string, unknown>> = {
  configs: ITaskConfig<TMeta>[];
  selectableConfigIds: string[];
  selectedConfigIds: string[];
  activeConfigId?: string;
  loading: boolean;
  selectionDisabled?: boolean;
  statusLoading?: boolean;
  fallbackColor: string;
  visibleStatusMap: Map<string, TActivityStatus>;
  statusMap: Map<string, TActivityStatus>;
  onSelectConfig: (config: ITaskConfig<TMeta>) => void;
  onCheckedChange: (configId: string, selected: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  loadingSlot?: ReactNode;
  loadMoreSlot?: ReactNode;
};

export function TaskConfigSelectionList<TMeta extends Record<string, unknown>>({
  configs,
  selectableConfigIds,
  selectedConfigIds,
  activeConfigId,
  loading,
  selectionDisabled,
  statusLoading = false,
  fallbackColor,
  visibleStatusMap,
  statusMap,
  onSelectConfig,
  onCheckedChange,
  onToggleSelectAll,
  loadingSlot,
  loadMoreSlot,
}: Props<TMeta>) {
  const allSelected =
    selectableConfigIds.length > 0 && selectableConfigIds.length === selectedConfigIds.length;
  const partiallySelected =
    selectedConfigIds.length > 0 && selectedConfigIds.length < selectableConfigIds.length;

  return (
    <>
      <Checkbox
        indeterminate={partiallySelected}
        onChange={(e) => onToggleSelectAll(e.target.checked)}
        checked={allSelected}
        disabled={selectionDisabled || selectableConfigIds.length === 0}
        className={cn(
          'ml-4.5 [&_.ant-checkbox-checked_.ant-checkbox]:border-primary-6!',
          '[&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6!'
        )}
      >
        Select all
      </Checkbox>
      <div className="flex grow flex-col justify-start gap-2 overflow-y-auto">
        {loading && (loadingSlot ?? <div className="flex h-full items-center justify-center" />)}
        {!loading && (
          <>
            {configs.map((config) => (
              <TaskConfigSelectionCard
                key={config.id}
                selected={activeConfigId === config.id}
                configId={config.id}
                configName={config.name}
                scanParams={config.meta.scan_parameters as Record<string, string | number>}
                execStatus={visibleStatusMap.get(config.id) ?? statusMap.get(config.id)}
                statusLoading={
                  statusLoading && !visibleStatusMap.has(config.id) && !statusMap.has(config.id)
                }
                onSelect={() => onSelectConfig(config)}
                onCheckedChange={onCheckedChange}
                isChecked={selectedConfigIds.includes(config.id)}
                selectionDisabled={selectionDisabled || statusLoading}
                fallbackColor={fallbackColor}
              />
            ))}
            {loadMoreSlot}
          </>
        )}
      </div>
    </>
  );
}
