import { useCallback, useEffect, useRef } from 'react';

import { nodeIdAxisRange } from '@/features/spike-viewer/node-id-range';
import { RasterRenderer } from '@/features/spike-viewer/renderer/raster-renderer';

import type {
  CellColors,
  RasterWindow,
  RowOrder,
  TimeAxis,
} from '@/features/spike-viewer/renderer/raster-renderer';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

export type RasterRendererOptions = {
  data: SpikeData | null;
  /** The population on show; scales the y-axis to its own node-id range. */
  populationName?: string;
  cellCount?: number;
  /** Colours for the cells of the population on show; undefined draws it in its own. */
  cellColors?: CellColors;
  /** Rows for the cells of the population on show; undefined keeps them by node id. */
  rowOrder?: RowOrder;
  /** A cell of the population on show to point out, by node id. */
  highlightedCell?: number | null;
  /** Called with the node id of a cell clicked in the plot. */
  onCellClick?: (cell: number) => void;
  /** Told what the plot is zoomed to, or null for everything, whenever that changes. */
  onWindowChange?: (window: RasterWindow | null) => void;
  /** Told where the time axis's visible span sits across the plot, whenever that moves. */
  onTimeAxisChange?: (axis: TimeAxis) => void;
  /** Zooms back out to everything whenever it changes. */
  windowResetKey?: number;
  /** Zooms the time axis to a span, whenever a new one is asked for. */
  timeWindowRequest?: { from: number; to: number; key: number };
};

export function useRasterRenderer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  {
    data,
    populationName,
    cellCount,
    cellColors,
    rowOrder,
    highlightedCell,
    onCellClick,
    onWindowChange,
    onTimeAxisChange,
    windowResetKey,
    timeWindowRequest,
  }: RasterRendererOptions
) {
  const rendererRef = useRef<RasterRenderer | null>(null);
  // Held in refs so a caller passing inline handlers does not tear the
  // renderer down and rebuild its WebGL context on every render.
  const onCellClickRef = useRef(onCellClick);
  const onWindowChangeRef = useRef(onWindowChange);
  const onTimeAxisChangeRef = useRef(onTimeAxisChange);
  useEffect(() => {
    onCellClickRef.current = onCellClick;
    onWindowChangeRef.current = onWindowChange;
    onTimeAxisChangeRef.current = onTimeAxisChange;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new RasterRenderer(el);
    renderer.onCellClick = (cell) => onCellClickRef.current?.(cell);
    renderer.onWindowChange = (window) => onWindowChangeRef.current?.(window);
    renderer.onTimeAxisChange = (axis) => onTimeAxisChangeRef.current?.(axis);
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

  // The renderer keeps them across new data, so the upload above needs no re-run.
  useEffect(() => {
    if (!rendererRef.current || !populationName) return;
    rendererRef.current.setCellColors(populationName, cellColors ?? null);
  }, [populationName, cellColors]);

  useEffect(() => {
    if (!rendererRef.current || !populationName) return;
    rendererRef.current.setRowOrder(populationName, rowOrder ?? null);
  }, [populationName, rowOrder]);

  useEffect(() => {
    if (!rendererRef.current || !populationName) return;
    rendererRef.current.setHighlightedCell(populationName, highlightedCell ?? null);
  }, [populationName, highlightedCell]);

  useEffect(() => {
    if (windowResetKey) rendererRef.current?.resetView();
  }, [windowResetKey]);

  useEffect(() => {
    if (timeWindowRequest) {
      rendererRef.current?.setTimeWindow(timeWindowRequest.from, timeWindowRequest.to);
    }
  }, [timeWindowRequest]);

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
