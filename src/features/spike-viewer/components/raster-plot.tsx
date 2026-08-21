'use client';

import { Empty } from 'antd';
import { useEffect, useMemo, useRef } from 'react';

import { useRasterRenderer } from '@/features/spike-viewer/hooks/use-raster-renderer';

import type { SpikeData } from '@/features/spike-viewer/spike-trace';

type RasterPlotProps = {
  data: SpikeData;
  /**
   * The one population to plot.
   *
   * The host picks it and names it above the plot, so that the raster and the 3D
   * replay beside it are always reading the same cells.
   */
  populationName: string | undefined;
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
  /** Called with a time in ms when the user clicks in the plot. */
  onSeek?: (timeInMs: number) => void;
};

export default function RasterPlot({
  data,
  populationName,
  markerSize,
  playheadRef,
  onSeek,
}: RasterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setVisiblePopulations, setBaseSize, setPlayhead } = useRasterRenderer(
    containerRef,
    data,
    onSeek
  );

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
    </div>
  );
}
