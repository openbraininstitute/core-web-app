import { useCallback, useEffect, useRef } from 'react';

import { nodeIdAxisRange } from '@/features/spike-viewer/node-id-range';
import { RasterRenderer } from '@/features/spike-viewer/renderer/raster-renderer';

import type { SpikeData } from '@/features/spike-viewer/spike-trace';

export function useRasterRenderer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  data: SpikeData | null,
  /** The population on show; scales the y-axis to its own node-id range. */
  populationName?: string,
  cellCount?: number,
  /** Called with a time in ms when the user clicks in the plot. */
  onSeek?: (timeInMs: number) => void
) {
  const rendererRef = useRef<RasterRenderer | null>(null);
  // Held in a ref so a caller passing an inline handler does not tear the
  // renderer down and rebuild its WebGL context on every render.
  const onSeekRef = useRef(onSeek);

  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new RasterRenderer(el);
    renderer.onSeek = (timeInMs) => onSeekRef.current?.(timeInMs);
    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [containerRef]);

  useEffect(() => {
    if (!rendererRef.current || !data) return;

    // The cell count arrives later and belongs to the effect below. Re-running
    // this one for it would re-upload every spike to move an axis.
    const { min, max } = nodeIdAxisRange(data.nodeIdRange.max);
    rendererRef.current.setData(data.populations, {
      xMin: data.timeRange.min,
      xMax: data.timeRange.max,
      yMin: min,
      yMax: max,
    });
  }, [data]);

  // Node ids are per-population row indices, not a shared scale — so the one
  // population on show gets the axis scaled to its own cells, where the
  // file-wide range above would squash it beside a larger sibling.
  useEffect(() => {
    const pop = data?.populations.find((p) => p.name === populationName);
    if (!rendererRef.current || !pop) return;
    const { min, max } = nodeIdAxisRange(pop.nodeIdRange.max, cellCount);
    rendererRef.current.setYBounds(min, max);
  }, [data, populationName, cellCount]);

  const setVisiblePopulations = useCallback((names: Set<string>) => {
    rendererRef.current?.setVisiblePopulations(names);
  }, []);

  const setBaseSize = useCallback((size: number) => {
    rendererRef.current?.setBaseSize(size);
  }, []);

  const setPlayhead = useCallback((timeInMs: number | null) => {
    rendererRef.current?.setPlayhead(timeInMs);
  }, []);

  return { setVisiblePopulations, setBaseSize, setPlayhead };
}
