import { RightOutlined } from '@ant-design/icons';
import { Checkbox, ConfigProvider } from 'antd';

import {
  ActivityExecutionStatus,
  type TActivityExecutionStatus,
} from '@/api/entitycore/types/entities/execution';
import { ScanParams } from '@/features/scan-config/components/scan-params';
import { StatusBadge } from '@/features/scan-config/status-badge';
import { executionStatusColorMap } from '@/ui/segments/activity-execution/color-map';

import type { ICircuitExtractionConfig } from '@/api/entitycore/types/entities/circuit-extraction-config';

type Props = {
  config: ICircuitExtractionConfig;
  execStatus?: TActivityExecutionStatus;
  onSelect: () => void;
  selected?: boolean;
  onSelectedForExtractionChange: (configId: string, selected: boolean) => void;
  selectedForExtraction: boolean;
  selectionDisabled?: boolean;
};

export function ExtractionConfigsLeftMenu({
  config,
  execStatus,
  onSelect,
  selected,
  onSelectedForExtractionChange,
  selectedForExtraction,
  selectionDisabled,
}: Props) {
  const color = executionStatusColorMap[execStatus ?? ActivityExecutionStatus.CREATED] ?? '#8c8c8c';
  const isSelectable =
    !execStatus ||
    execStatus === ActivityExecutionStatus.CREATED ||
    execStatus === ActivityExecutionStatus.ERROR;

  return (
    <div className="flex-none">
      <div
        className="rounded-lg px-4 pb-4 transition-colors duration-300"
        style={{
          border: `2px solid ${selected ? color : 'transparent'}`,
          backgroundColor: selected ? `${color}0f` : 'white',
        }}
      >
        <button
          type="button"
          title={config.name}
          className="mb-2 flex h-18 w-full cursor-pointer items-center justify-between"
          onClick={onSelect}
        >
          <div className="min-w-0 flex-1 overflow-hidden text-left font-bold">
            {isSelectable ? (
              <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
                <div className="flex min-w-0 items-center" style={{ maxWidth: '100%' }}>
                  <Checkbox
                    className="mr-2 transition-colors duration-300 [&_.ant-checkbox+span]:block [&_.ant-checkbox+span]:truncate [&_.ant-checkbox+span]:overflow-hidden [&_.ant-checkbox+span]:text-ellipsis [&_.ant-checkbox+span]:whitespace-nowrap"
                    disabled={selectionDisabled}
                    onChange={(e) => onSelectedForExtractionChange(config.id, e.target.checked)}
                    checked={selectedForExtraction}
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
        </button>
        <ScanParams
          scanParams={config.scan_parameters as Record<string, string | number>}
          color={color}
        />
      </div>
    </div>
  );
}
