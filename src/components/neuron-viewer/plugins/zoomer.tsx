import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Slider } from 'antd';

import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';

type Props = {
  value: number;
  onChange: (value: number) => void;
  className?: ComponentProps<'div'>['className'];
  onZoomIn?: () => void;
  onZoomOut?: () => void;
};

export function Zoomer({ className, value, onChange, onZoomIn, onZoomOut }: Props) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      {onZoomIn && <ZoomInOutlined className="text-white" onClick={onZoomIn} />}
      <Slider
        vertical
        value={value}
        onChange={onChange}
        tooltip={{
          formatter: (v) => `${v ? v * 20 : v} %`,
        }}
        min={1}
        max={5}
        step={0.1}
      />
      {onZoomOut && <ZoomOutOutlined className="text-white" onClick={onZoomOut} />}
    </div>
  );
}
