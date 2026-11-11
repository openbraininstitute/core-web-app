import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RasterWindow, RowOrder } from '@/features/spike-viewer/renderer/raster-renderer';

/** How long the raster's zoom has to rest before the statistics follow it. */
const WINDOW_SETTLE_MS = 150;

/**
 * What the raster is zoomed to, once it rests: the statistics are over its
 * span of time and the cells of its rows, and the scene keeps only those.
 * The raster itself is not cut by it, so a pan finds its spikes in place.
 */
export function useRasterWindow({
  populationName,
  cellCount,
  rowOrder,
}: {
  populationName: string;
  cellCount: number | undefined;
  /** The raster's rows, where they are not in node order. */
  rowOrder: RowOrder | undefined;
}) {
  const [rasterWindow, setRasterWindow] = useState<{
    population: string;
    window: RasterWindow;
  } | null>(null);
  const settleTimer = useRef(0);
  const handleWindowChange = useCallback(
    (next: RasterWindow | null) => {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(
        () =>
          setRasterWindow(
            next && populationName ? { population: populationName, window: next } : null
          ),
        WINDOW_SETTLE_MS
      );
    },
    [populationName]
  );
  useEffect(() => () => window.clearTimeout(settleTimer.current), []);
  const [windowResetKey, setWindowResetKey] = useState(0);
  const clearRasterWindow = useCallback(() => setWindowResetKey((k) => k + 1), []);
  const currentWindow = rasterWindow?.population === populationName ? rasterWindow.window : null;
  // A flag per cell, set for those in the window's rows.
  const windowCells = useMemo(() => {
    const rows = currentWindow?.rows;
    if (!rows || cellCount === undefined) return null;
    const order = rowOrder?.rows;
    const flags = new Uint8Array(cellCount);
    for (let cell = 0; cell < cellCount; cell++) {
      const row = order ? order[cell] : cell;
      if (row >= rows[0] && row <= rows[1]) flags[cell] = 1;
    }
    return flags;
  }, [currentWindow, cellCount, rowOrder]);

  const [timeWindowRequest, setTimeWindowRequest] = useState<{
    from: number;
    to: number;
    key: number;
  }>();
  // A typed span applies at once, ahead of the raster's settled report of it,
  // so a second field committed straight after builds on it.
  const requestTimeWindow = (from: number, to: number) => {
    setTimeWindowRequest((previous) => ({ from, to, key: (previous?.key ?? 0) + 1 }));
    if (populationName) {
      setRasterWindow((previous) => ({
        population: populationName,
        window: {
          time: [from, to],
          rows: previous?.population === populationName ? previous.window.rows : null,
        },
      }));
    }
  };

  return {
    currentWindow,
    windowCells,
    handleWindowChange,
    windowResetKey,
    clearRasterWindow,
    timeWindowRequest,
    requestTimeWindow,
  };
}
