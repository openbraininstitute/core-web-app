'use client';

import { QuestionCircleOutlined } from '@ant-design/icons';
import { RiEqualizerLine } from '@remixicon/react';
import { Slider } from 'antd';

import { useControlsCollapsed } from '@/features/spike-viewer/components/collapsing-controls';
import { Button } from '@/ui/molecules/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

type RasterPlotControlsProps = {
  markerSize: number;
  onMarkerSizeChange: (size: number) => void;
  minSize?: number;
  maxSize?: number;
};

/**
 * The raster's settings: behind the settings button in the row of controls,
 * and a slider among the others once the row has folded into its panel.
 */
export default function RasterPlotControls({
  markerSize,
  onMarkerSizeChange,
  minSize = 1,
  maxSize = 10,
}: RasterPlotControlsProps) {
  const collapsed = useControlsCollapsed();
  const slider = (
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
  );
  if (collapsed) return <div className="w-56">{slider}</div>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="icon" size="sm" aria-label="Open chart settings">
          <RiEqualizerLine className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 border-neutral-2 bg-white shadow-lg">
        {slider}
      </PopoverContent>
    </Popover>
  );
}

/** How the raster is zoomed, panned and picked from: kept at the row's right end, never folded away. */
export function RasterHelp() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="icon" size="sm" aria-label="Show chart controls help">
          <QuestionCircleOutlined />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        showArrow={false}
        className="bg-white text-primary-9 shadow-md"
      >
        Drag to zoom: the statistics and the 3D view follow the window · Shift+drag to pan ·
        Double-click to reset · Click a spike to pick its cell
      </TooltipContent>
    </Tooltip>
  );
}
