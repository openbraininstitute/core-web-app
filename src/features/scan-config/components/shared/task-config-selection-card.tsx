import { RiArrowRightSLine } from '@remixicon/react';
import { Checkbox } from 'antd';

import {
  ActivityStatus,
  type TActivityStatus,
} from '@/api/entitycore/types/entities/task-activity';
import { ScanParams } from '@/features/scan-config/components/scan-params';
import {
  StatusBadge,
  StatusBadgeSkeleton,
} from '@/features/scan-config/components/shared/status-badge';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import { cn } from '@/utils/css-class';

import type { CSSProperties } from 'react';

type Props = {
  configId: string;
  configName: string;
  scanParams: Record<string, unknown> | undefined;
  execStatus?: TActivityStatus;
  statusLoading?: boolean;
  selected?: boolean;
  isChecked: boolean;
  selectionDisabled?: boolean;
  fallbackColor: string;
  onSelect: () => void;
  onCheckedChange: (configId: string, selected: boolean) => void;
};

export function TaskConfigSelectionCard({
  configId,
  configName,
  scanParams,
  execStatus,
  statusLoading,
  selected,
  isChecked,
  selectionDisabled,
  fallbackColor,
  onSelect,
  onCheckedChange,
}: Props) {
  const color = executionStatusColorMap[execStatus ?? ActivityStatus.CREATED] ?? fallbackColor;
  const isSelectable =
    !execStatus || execStatus === ActivityStatus.CREATED || execStatus === ActivityStatus.ERROR;

  return (
    <button
      className={cn(
        'flex-none cursor-pointer group rounded-2xl border border-gray-200',
        'hover:border-gray-300 hover:border-1.5 transition-all duration-300',
        'shadow-[0_1px_1px_rgba(16,24,40,0.08)] mr-1'
      )}
      type="button"
      title={configName}
      onClick={onSelect}
    >
      <div
        className={cn(
          'rounded-2xl cursor-pointer px-4 pb-4 transition-colors duration-300 group group-hover:bg-gray-50!',
          statusLoading && 'animate-pulse'
        )}
        style={
          {
            '--card-color': color,
            border: `2px solid ${selected ? color : 'transparent'}`,
            backgroundColor: selected ? `${color}0f` : 'white',
          } as CSSProperties & { '--card-color': string }
        }
      >
        <div className="mb-2 flex h-18 w-full items-center justify-between">
          <div className="min-w-0 flex-1 overflow-hidden text-left font-bold">
            {isSelectable ? (
              <div className="flex min-w-0 items-center" style={{ maxWidth: '100%' }}>
                <Checkbox
                  className={cn(
                    'mr-2 transition-colors duration-300 [&_.ant-checkbox+span]:block [&_.ant-checkbox+span]:truncate [&_.ant-checkbox+span]:overflow-hidden [&_.ant-checkbox+span]:text-ellipsis [&_.ant-checkbox+span]:whitespace-nowrap',
                    '[&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6! [&_.ant-checkbox-checked_.ant-checkbox]:border-primary-6!',
                    '[&_.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-6!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!'
                  )}
                  disabled={selectionDisabled}
                  onChange={(e) => onCheckedChange(configId, e.target.checked)}
                  checked={isChecked}
                  style={{ color, maxWidth: '100%', display: 'flex' }}
                >
                  <span className="text-lg transition-colors duration-300">{configName}</span>
                </Checkbox>
              </div>
            ) : (
              <span
                style={{ color }}
                className="block truncate text-lg transition-colors duration-300"
              >
                {configName}
              </span>
            )}
          </div>
          <div className="ml-4 flex item-center justify-center gap-0.5 shrink-0">
            {statusLoading ? <StatusBadgeSkeleton /> : <StatusBadge status={execStatus} />}
            <div className="flex items-center justify-center">
              <RiArrowRightSLine className="size-5 shrink-0 text-gray-500" />
            </div>
          </div>
        </div>
        <ScanParams configId={configId} scanParams={scanParams} color={color} />
      </div>
    </button>
  );
}
