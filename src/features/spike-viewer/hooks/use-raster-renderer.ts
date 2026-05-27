import { useCallback, useEffect, useRef } from 'react';

import { RasterRenderer } from '@/features/spike-viewer/renderer/raster-renderer';

import type { SpikeData } from '@/features/spike-viewer/spike-trace';

export function useRasterRenderer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  data: SpikeData | null
) {
  const rendererRef = useRef<RasterRenderer | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new RasterRenderer(el);
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

  return { setVisiblePopulations, setBaseSize };
}
