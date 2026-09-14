import { RiArrowRightSLine } from '@remixicon/react';
import { Checkbox } from 'antd';
import { useState } from 'react';

import {
  ActivityStatus,
  type TActivityStatus,
} from '@/api/entitycore/types/entities/task-activity';
import { ScanParams } from '@/features/scan-config/components/scan-params';
import {
  StatusBadge,
  StatusBadgeSkeleton,
} from '@/features/scan-config/components/shared/status-badge';
import { WorkflowItemCopyIdButton } from '@/features/scan-config/components/shared/workflow-item-copy-id-button';
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
  const [copyHovered, setCopyHovered] = useState(false);
  const color = executionStatusColorMap[execStatus ?? ActivityStatus.CREATED] ?? fallbackColor;
  const isSelectable =
    !execStatus || execStatus === ActivityStatus.CREATED || execStatus === ActivityStatus.ERROR;

  return (
    /* biome-ignore lint/a11y/useSemanticElements: The card contains nested controls, so a button wrapper would be invalid. */
    <div
      data-testid={`scan-config-coordinate-${configId}`}
      className={cn(
        'group flex-none cursor-pointer rounded-2xl border border-gray-200',
        'hover:border-gray-300 hover:border-1.5 transition-all duration-300',
        'shadow-[0_1px_1px_rgba(16,24,40,0.08)] mr-1'
      )}
      role="button"
      tabIndex={0}
      title={configName}
      aria-label={configName}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
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
        <div className="mb-2 flex min-h-18 w-full items-start justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden pt-1 text-left font-bold">
            {isSelectable ? (
              <div className="flex min-w-0 items-start" style={{ maxWidth: '100%' }}>
                <Checkbox
                  className={cn(
                    'mr-2 transition-colors duration-300 [&_.ant-checkbox+span]:block [&_.ant-checkbox+span]:max-w-full [&_.ant-checkbox+span]:break-words [&_.ant-checkbox+span]:line-clamp-3 [&_.ant-checkbox+span]:whitespace-normal',
                    '[&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6! [&_.ant-checkbox-checked_.ant-checkbox]:border-primary-6!',
                    '[&_.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox]:border-primary-6!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!'
                  )}
                  disabled={selectionDisabled}
                  onChange={(e) => onCheckedChange(configId, e.target.checked)}
                  checked={isChecked}
                  style={{ color, maxWidth: '100%', display: 'flex' }}
                >
                  <span className="text-lg leading-6 transition-colors duration-300">
                    {configName}
                  </span>
                </Checkbox>
              </div>
            ) : (
              <span
                style={{ color }}
                className="block break-words text-lg leading-6 transition-colors duration-300 line-clamp-3"
              >
                {configName}
              </span>
            )}
          </div>
          <div className="ml-2 flex shrink-0 items-center justify-center gap-0.5 pt-1">
            <div
              className={cn(
                'flex items-center justify-center overflow-hidden transition-[width,opacity] duration-200',
                copyHovered ? 'size-5 opacity-100' : 'w-auto opacity-100'
              )}
            >
              {copyHovered ? (
                <span
                  className="size-5 rounded-full"
                  style={{ backgroundColor: color }}
                  role="img"
                  aria-label={execStatus ?? 'created'}
                  title={execStatus ?? 'created'}
                />
              ) : statusLoading ? (
                <StatusBadgeSkeleton />
              ) : (
                <StatusBadge status={execStatus} />
              )}
            </div>
            {configId && (
              <WorkflowItemCopyIdButton value={configId} onHoverChange={setCopyHovered} />
            )}
            <div className="flex items-center justify-center">
              <RiArrowRightSLine className="size-5 shrink-0 text-gray-500" />
            </div>
          </div>
        </div>
        <ScanParams configId={configId} scanParams={scanParams} color={color} />
      </div>
    </div>
  );
}
