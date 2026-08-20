import { useCallback, useEffect, useRef } from 'react';

import { RasterRenderer } from '@/features/spike-viewer/renderer/raster-renderer';

import type { SpikeData } from '@/features/spike-viewer/spike-trace';

export function useRasterRenderer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  data: SpikeData | null,
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

    rendererRef.current.setData(data.populations, {
      xMin: data.timeRange.min,
      xMax: data.timeRange.max,
      yMin: data.nodeIdRange.min,
      yMax: data.nodeIdRange.max,
    });
  }, [data]);

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
