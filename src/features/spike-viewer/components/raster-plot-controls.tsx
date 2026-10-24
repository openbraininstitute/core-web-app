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
  /** The replay's spike afterglow, set beside the marker size where a replay plays alongside. */
  afterglow?: { seconds: number; onChange: (seconds: number) => void };
};

export default function RasterPlotControls({
  markerSize,
  onMarkerSizeChange,
  minSize = 1,
  maxSize = 10,
  afterglow,
}: RasterPlotControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="icon" size="sm" aria-label="Open chart settings">
            <SettingOutlined />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 border-neutral-2 bg-white shadow-lg">
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
            {afterglow && (
              <>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                  <span>Spike afterglow</span>
                  <span className="tabular-nums">{afterglow.seconds.toFixed(2)} s</span>
                </div>
                <Slider
                  value={afterglow.seconds}
                  min={0.05}
                  max={1}
                  step={0.05}
                  onChange={afterglow.onChange}
                  tooltip={{ formatter: null }}
                />
                <p className="text-[11px] leading-snug text-gray-500">
                  How long a spike stays lit in the 3D view. Measured in real time, so a flash looks
                  the same at any playback speed.
                </p>
              </>
            )}
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
          side="bottom"
          align="start"
          showArrow={false}
          className="bg-white text-primary-9 shadow-md"
        >
          Drag to zoom: the statistics and the 3D view follow the window · Shift+drag to pan ·
          Double-click to reset · Click a spike to pick its cell
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
