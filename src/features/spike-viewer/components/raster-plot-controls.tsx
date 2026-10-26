'use client';

import { RiEqualizerLine, RiQuestionMark } from '@remixicon/react';
import { Slider } from 'antd';

import { useControlsCollapsed } from '@/features/spike-viewer/components/collapsing-controls';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { ROUND_PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

import type { ReactNode } from 'react';

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
        <button type="button" aria-label="Open chart settings" className={ROUND_PILL_CLASS}>
          <RiEqualizerLine className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 border-neutral-2 bg-white shadow-lg">
        {slider}
      </PopoverContent>
    </Popover>
  );
}

/** A plot's help, a question mark at the top right of its controls, never folded away. */
export function PlotHelp({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="Show chart controls help" className={ROUND_PILL_CLASS}>
          <RiQuestionMark className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        showArrow={false}
        className="bg-white text-primary-9 shadow-md"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/** How the raster is zoomed, panned and picked from. */
export function RasterHelp() {
  return (
    <PlotHelp>
      Drag to zoom: the statistics and the 3D view follow the window · Shift+drag to pan ·
      Double-click to reset · Click a spike to pick its cell
    </PlotHelp>
  );
}
