'use client';

import { Empty } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useCellRow } from '@/features/spike-viewer/cell-row';
import { TimelineCard } from '@/features/spike-viewer/components/timeline-card';
import { useZoomHint, ZoomHint } from '@/features/spike-viewer/components/zoom-hint';
import { useRasterRenderer } from '@/features/spike-viewer/hooks/use-raster-renderer';
import { TooltipCard } from '@/features/spike-viewer/spike-statistics/plot-tooltip';

import type { CellRowSource } from '@/features/spike-viewer/cell-row';
import type { RasterRendererOptions } from '@/features/spike-viewer/hooks/use-raster-renderer';
import type { EventsHover, SpikeHover } from '@/features/spike-viewer/renderer/raster-renderer';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

type RasterPlotProps = Omit<
  RasterRendererOptions,
  'data' | 'populationName' | 'cellCount' | 'onEventsHover' | 'onSpikeHover'
> & {
  data: SpikeData;
  /**
   * The one population to plot.
   *
   * The host picks it and names it above the plot, so that the raster and the 3D
   * replay beside it are always reading the same cells.
   */
  populationName: string | undefined;
  /** Cells in that population, or undefined where the host could not find out. */
  cellCount: number | undefined;
  markerSize: number;
  /**
   * Filled in with a setter that moves the playhead rule, and cleared on
   * unmount.
   *
   * A ref rather than a prop because the 3D replay reports its clock on every
   * painted frame: passing that as a prop would re-render this tree at 60 Hz to
   * move one line.
   */
  playheadRef?: React.RefObject<((timeInMs: number | null) => void) | null>;
  /** Where a hovered spike's card reads its cell's row of the nodes table. */
  cellRows?: CellRowSource;
};

export default function RasterPlot({
  data,
  populationName,
  cellCount,
  markerSize,
  playheadRef,
  cellRows,
  ...options
}: RasterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // What is under the pointer, carded here: the renderer draws only canvases.
  const [eventsHover, setEventsHover] = useState<EventsHover | null>(null);
  const [spikeHover, setSpikeHover] = useState<SpikeHover | null>(null);
  // A double-click zooms back out, as on the statistics' plots.
  const [hintUp, zoomed, zoomedOut] = useZoomHint('raster');
  const { onWindowChange } = options;
  const { setVisiblePopulations, setBaseSize, setPlayhead } = useRasterRenderer(containerRef, {
    data,
    populationName,
    cellCount,
    ...options,
    onWindowChange: (window) => {
      if (window) zoomed();
      else zoomedOut();
      onWindowChange?.(window);
    },
    onEventsHover: setEventsHover,
    onSpikeHover: setSpikeHover,
  });

  useEffect(() => {
    if (!playheadRef) return;

    playheadRef.current = setPlayhead;
    // Clearing the rule as well as the ref: the ref only carries pushes, so a
    // driver that detaches would otherwise strand its last position on the
    // plot as a marker nothing owns and nothing can move.
    return () => {
      playheadRef.current = null;
      setPlayhead(null);
    };
  }, [playheadRef, setPlayhead]);

  const visiblePopulations = useMemo(
    () => new Set(populationName ? [populationName] : []),
    [populationName]
  );

  useEffect(() => {
    setVisiblePopulations(visiblePopulations);
  }, [visiblePopulations, setVisiblePopulations]);

  useEffect(() => {
    setBaseSize(markerSize);
  }, [markerSize, setBaseSize]);

  const spikeCount =
    data.populations.find((p) => p.name === populationName)?.timestamps.length ?? 0;

  // Overlaid rather than returned in place of the plot: the renderer is built
  // once against this container, so unmounting it for an empty population would
  // strand the WebGL context and leave the plot blank after switching back.
  return (
    <div className="relative h-full min-h-0">
      <div ref={containerRef} className="h-full min-h-0" />
      {spikeCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <Empty
            description={
              populationName
                ? `No spikes recorded for “${populationName}”`
                : 'No spikes recorded during this simulation'
            }
          />
        </div>
      )}
      {eventsHover && <TimelineCard hover={eventsHover} />}
      {spikeHover && <SpikeCard hover={spikeHover} cellRows={cellRows} />}
      {/* Under the raster's controls, which sit over its top. */}
      <ZoomHint visible={hintUp} className="top-12" />
    </div>
  );
}

/** The spike under the pointer: when it fired, and its cell's row of the nodes table. */
function SpikeCard({ hover, cellRows }: { hover: SpikeHover; cellRows?: CellRowSource }) {
  const row = useCellRow(cellRows, hover.nodeId);
  return (
    <TooltipCard
      clientX={hover.clientX}
      clientY={hover.clientY}
      card={{
        title: `Node ${hover.nodeId}`,
        subtitle: hover.population,
        swatch: hover.color,
        rows: [
          { label: 'Spike time', value: `${hover.time.toFixed(2)} ms`, strong: true },
          ...(row ?? []),
        ],
      }}
    />
  );
}
