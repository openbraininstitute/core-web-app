import { RightOutlined } from '@ant-design/icons';
import { Checkbox, ConfigProvider } from 'antd';

import {
  ActivityStatus,
  type TActivityStatus,
} from '@/api/entitycore/types/entities/task-activity';
import { ScanParams } from '@/features/scan-config/components/scan-params';
import { StatusBadge } from '@/features/scan-config/status-badge';
import { executionStatusColorMap } from '@/features/task/activity-execution/color-map';

import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TSkeletonizationTaskConfigMeta } from '@/entity-configuration/domain/processing/skeletonization-campaign';

type Props = {
  config: ITaskConfig<TSkeletonizationTaskConfigMeta>;
  execStatus?: TActivityStatus;
  onSelect: () => void;
  selected?: boolean;
  onSelectedForSkeletonizationChange: (configId: string, selected: boolean) => void;
  selectedForSkeletonization: boolean;
  selectionDisabled?: boolean;
};

export function SkeletonizationConfigsLeftMenu({
  config,
  execStatus,
  onSelect,
  selected,
  onSelectedForSkeletonizationChange,
  selectedForSkeletonization,
  selectionDisabled,
}: Props) {
  const color = executionStatusColorMap[execStatus ?? ActivityStatus.CREATED] ?? '#8c8c8c';
  const isSelectable =
    !execStatus || execStatus === ActivityStatus.CREATED || execStatus === ActivityStatus.ERROR;

  return (
    <button
      className="flex-none cursor-pointer shadow-xs group"
      type="button"
      title={config.name}
      onClick={onSelect}
    >
      <div
        className="rounded-xl px-4 pb-4 transition-colors duration-300 group group-hover:bg-gray-50!"
        style={
          {
            '--card-color': color,
            border: `2px solid ${selected ? color : 'transparent'}`,
            backgroundColor: selected ? `${color}0f` : 'white',
          } as React.CSSProperties & { '--card-color': string }
        }
      >
        <div className="mb-2 flex h-18 w-full items-center justify-between">
          <div className="min-w-0 flex-1 overflow-hidden text-left font-bold">
            {isSelectable ? (
              <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
                <div className="flex min-w-0 items-center" style={{ maxWidth: '100%' }}>
                  <Checkbox
                    className="mr-2 transition-colors duration-300 [&_.ant-checkbox+span]:block [&_.ant-checkbox+span]:truncate [&_.ant-checkbox+span]:overflow-hidden [&_.ant-checkbox+span]:text-ellipsis [&_.ant-checkbox+span]:whitespace-nowrap"
                    disabled={selectionDisabled}
                    onChange={(e) =>
                      onSelectedForSkeletonizationChange(config.id, e.target.checked)
                    }
                    checked={selectedForSkeletonization}
                    style={{ color, maxWidth: '100%', display: 'flex' }}
                  >
                    <span className="text-lg transition-colors duration-300">{config.name}</span>
                  </Checkbox>
                </div>
              </ConfigProvider>
            ) : (
              <span
                style={{ color }}
                className="block truncate text-lg transition-colors duration-300"
              >
                {config.name}
              </span>
            )}
          </div>
          <div className="ml-4 flex shrink-0">
            <StatusBadge status={execStatus} />
            <RightOutlined className="ml-2 text-sm" />
          </div>
        </div>
        <ScanParams
          scanParams={config.meta.scan_parameters as Record<string, string | number>}
          color={color}
        />
      </div>
    </button>
  );
}
