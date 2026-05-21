import { FileImageOutlined, LineChartOutlined } from '@ant-design/icons';
import { Radio, type RadioChangeEvent } from 'antd';

import type { EphysViewerVariant } from '@/features/ephys-viewer/label-styles';
import { cn } from '@/utils/css-class';

import '../styles/trace-view-mode-toggle.css';

export enum TraceViewMode {
  OVERVIEW = 'overview',
  DETAILED = 'detailed',
}

type Props = {
  value: TraceViewMode;
  onChange: (e: RadioChangeEvent) => void;
  variant?: EphysViewerVariant;
  detailedLabel?: string;
};

export function TraceViewModeToggle({
  value,
  onChange,
  variant = 'light',
  detailedLabel = 'Interactive Details',
}: Props) {
  return (
    <Radio.Group
      onChange={onChange}
      value={value}
      className={cn(variant === 'onPrimary' && 'trace-view-mode-toggle-on-primary')}
    >
      <Radio.Button value={TraceViewMode.OVERVIEW}>
        <FileImageOutlined /> Overview
      </Radio.Button>
      <Radio.Button value={TraceViewMode.DETAILED}>
        <LineChartOutlined /> {detailedLabel}
      </Radio.Button>
    </Radio.Group>
  );
}
