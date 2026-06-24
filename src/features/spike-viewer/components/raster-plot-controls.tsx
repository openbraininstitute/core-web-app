'use client';

import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Slider } from 'antd';

import { Button } from '@/ui/molecules/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

type RasterPlotControlsProps = {
  markerSize: number;
  onMarkerSizeChange: (size: number) => void;
  minSize?: number;
  maxSize?: number;
};

export default function RasterPlotControls({
  markerSize,
  onMarkerSizeChange,
  minSize = 1,
  maxSize = 10,
}: RasterPlotControlsProps) {
  return (
    <div className="ml-auto flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="icon" size="sm" aria-label="Open chart settings">
            <SettingOutlined />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 border-neutral-2 bg-white shadow-lg">
          <div className="flex select-none flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Marker size</span>
              <span className="tabular-nums">{markerSize}</span>
            </div>
            <Slider
              value={markerSize}
              min={minSize}
              max={maxSize}
              step={1}
              onChange={onMarkerSizeChange}
              tooltip={{ formatter: null }}
            />
          </div>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="icon" size="sm" aria-label="Show chart controls help">
            <QuestionCircleOutlined />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          align="start"
          alignOffset={-32}
          showArrow={false}
          className="bg-white text-primary-9 shadow-md"
        >
          Drag to zoom · Shift+drag to pan · Double-click to reset
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
