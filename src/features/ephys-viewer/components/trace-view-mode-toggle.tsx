import { FileImageOutlined, LineChartOutlined } from '@ant-design/icons';
import { Radio, type RadioChangeEvent } from 'antd';

import { type TViewVariant, ViewVariant } from '@/constants';
import { cn } from '@/utils/css-class';

export const TraceViewMode = {
  Overview: 'overview',
  Detailed: 'detailed',
} as const;

export type TTraceViewMode = (typeof TraceViewMode)[keyof typeof TraceViewMode];

type Props = {
  value: TTraceViewMode;
  onChange: (e: RadioChangeEvent) => void;
  variant?: TViewVariant;
  detailedLabel?: string;
};

export function TraceViewModeToggle({
  value,
  onChange,
  variant = ViewVariant.Light,
  detailedLabel = 'Interactive Details',
}: Props) {
  return (
    <Radio.Group
      onChange={onChange}
      value={value}
      className={cn(
        variant === ViewVariant.Default && [
          'inline-flex',
          '[&_.ant-radio-button-wrapper]:border-white/35 [&_.ant-radio-button-wrapper]:bg-transparent [&_.ant-radio-button-wrapper]:font-semibold [&_.ant-radio-button-wrapper]:text-primary-2',
          '[&_.ant-radio-button-wrapper:hover]:text-white',
          '[&_.ant-radio-button-wrapper:first-child]:rounded-l-full [&_.ant-radio-button-wrapper:last-child]:rounded-r-full',
          '[&_.ant-radio-button-wrapper::before]:bg-white/35!',
          '[&_.ant-radio-button-wrapper-checked]:border-primary-8! [&_.ant-radio-button-wrapper-checked]:bg-primary-8! [&_.ant-radio-button-wrapper-checked]:text-white!',
          '[&_.ant-radio-button-wrapper-checked_.anticon]:text-white! [&_.ant-radio-button-wrapper-checked_.ant-radio-button-label]:text-white!',
        ]
      )}
    >
      <Radio.Button value={TraceViewMode.Overview}>
        <FileImageOutlined /> Overview
      </Radio.Button>
      <Radio.Button value={TraceViewMode.Detailed}>
        <LineChartOutlined /> {detailedLabel}
      </Radio.Button>
    </Radio.Group>
  );
}
