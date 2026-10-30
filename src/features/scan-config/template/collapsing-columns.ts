import { useCallback, useEffect, useRef, useState } from 'react';

import { SHUT_BAR_SIZE } from '@/features/circuit-viewer/pane-resize-handle';

/** Room each configuration column keeps while it is open. */
const FLOORS = { left: 220, middle: 280 };

/** What the drag leaves of the two configuration columns, the preview taking the rest. */
export interface IColumnsLayout {
  /** Px, 0 while shut. */
  left: number;
  middle: number;
  /** Which have shut into the one bar: the middle one alone, then both together. */
  shut: 'none' | 'middle' | 'both';
}

/**
 * Where the preview's left edge is dragged to, `x` from the columns' left, as the two columns
 * before it. The edge goes no further right than the middle of the width, where it begins, so
 * the preview never has less than half of it. Dragged left, the middle column narrows to its
 * floor and, past half of that, shuts into a bar; the left one then narrows the same way and,
 * past half of its floor, shuts into that bar too, leaving the preview the rest. `left` is the
 * left column's width while there is room for it, its share of the width until a drag.
 */
export function columnsAt(x: number, width: number, left: number): IColumnsLayout {
  const at = Math.min(x, width / 2);
  if (at >= left + FLOORS.middle / 2) {
    return { left, middle: Math.max(FLOORS.middle, at - left), shut: 'none' };
  }
  const room = at - SHUT_BAR_SIZE;
  if (room >= FLOORS.left / 2) {
    return { left: Math.min(left, Math.max(FLOORS.left, room)), middle: 0, shut: 'middle' };
  }
  return { left: 0, middle: 0, shut: 'both' };
}

/** The grid's columns for a layout: the open ones, the bar for those shut, and the preview. */
export function columnsTemplate({ left, middle, shut }: IColumnsLayout): string {
  const bar = `${SHUT_BAR_SIZE}px`;
  if (shut === 'both') return `${bar} minmax(0,1fr)`;
  if (shut === 'middle') return `${left}px ${bar} minmax(0,1fr)`;
  return `${left}px ${middle}px minmax(0,1fr)`;
}

/**
 * The configuration columns of the default layout, collapsible by dragging the preview's edge:
 * the grid's width, the edge dragged to (null where it was never dragged, the `1fr 1fr 2fr` the
 * layout began with), and the way back to that.
 */
export function useCollapsingColumns() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [edge, setEdge] = useState<number | null>(null);
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const sized = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    sized.observe(grid);
    return () => sized.disconnect();
  }, []);

  const share = width / 4;
  const layout: IColumnsLayout | null =
    width > 0 && edge !== null ? columnsAt(edge, width, share) : null;
  const reset = useCallback(() => setEdge(null), []);
  return {
    gridRef,
    /** Null until dragged: the layout's own fractions. */
    template: layout ? columnsTemplate(layout) : null,
    shut: layout?.shut ?? 'none',
    onEdgeDrag: setEdge,
    reset,
  };
}
