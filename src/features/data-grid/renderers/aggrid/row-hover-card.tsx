'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { GRID_OVERLAY_Z_CLASS } from '@/features/data-grid/react/molecules-theme';
import { isDetailRow } from '@/features/data-grid/renderers/aggrid/detail-rows';
import { cn } from '@/utils/css-class';

import type { CellMouseOverEvent } from 'ag-grid-community';
import type { ReactNode } from 'react';
import type { TDisplayRow } from './detail-rows';

/** How long the pointer rests on a row before its card shows. */
const SHOW_DELAY_MS = 400;
/** Grace for the pointer crossing from one cell of a row to the next. */
const HIDE_DELAY_MS = 120;
/** Room below a row for its card, short of which it opens above instead. */
const ROOM_BELOW_PX = 200;
/** Room right of the card's left edge, short of which it moves left. */
const ROOM_RIGHT_PX = 400;
const GAP_PX = 6;

interface IHoveredRow<Row> {
  id: string;
  row: Row;
  left: number;
  /** the row edge the card hangs from: its bottom, or its top when it opens above */
  top: number;
  above: boolean;
}

/**
 * The card under the row the pointer rests on. AG Grid's cell events drive it, since rows
 * are not components of ours. Pinned columns, whose controls carry tooltips of their own,
 * and columns with a hover card of their own (`ownHoverCard`) are left out.
 */
export function useRowHoverCard<Row>(render: ((row: Row) => ReactNode) | undefined) {
  const [hovered, setHovered] = useState<IHoveredRow<Row> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // read by the handlers below, which stay the same from render to render
  const shownId = useRef<string | null>(null);
  useEffect(() => {
    shownId.current = hovered?.id ?? null;
  }, [hovered]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onCellMouseOver = useCallback((e: CellMouseOverEvent<TDisplayRow<Row>>) => {
    clearTimeout(timer.current);
    const { data, node, column, event } = e;
    const id = node.id;
    const ownHoverCard = Boolean(column.getColDef().context?.ownHoverCard);
    if (!data || isDetailRow(data) || !id || column.isPinned() || ownHoverCard) {
      setHovered(null);
      return;
    }
    if (shownId.current === id) return;

    const pointer = event instanceof MouseEvent ? event : null;
    const rowRect =
      pointer?.target instanceof Element
        ? pointer.target.closest('.ag-row')?.getBoundingClientRect()
        : undefined;
    if (!pointer || !rowRect) return;

    const above = rowRect.bottom + ROOM_BELOW_PX > window.innerHeight;
    const next: IHoveredRow<Row> = {
      id,
      row: data as Row,
      left: Math.max(GAP_PX, Math.min(pointer.clientX, window.innerWidth - ROOM_RIGHT_PX)),
      top: above ? rowRect.top - GAP_PX : rowRect.bottom + GAP_PX,
      above,
    };
    // one row to the next swaps at once; a first card waits for the pointer to rest
    timer.current = setTimeout(() => setHovered(next), shownId.current ? 0 : SHOW_DELAY_MS);
  }, []);

  const onCellMouseOut = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHovered(null), HIDE_DELAY_MS);
  }, []);

  // a scroll moves the row out from under its card
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setHovered(null);
  }, []);

  const card =
    render && hovered
      ? createPortal(
          <div
            className={cn(
              'pointer-events-none fixed',
              GRID_OVERLAY_Z_CLASS,
              hovered.above && '-translate-y-full'
            )}
            style={{ left: hovered.left, top: hovered.top }}
            data-testid="data-grid-row-hover-card"
          >
            {render(hovered.row)}
          </div>,
          document.body
        )
      : null;

  return render
    ? { onCellMouseOver, onCellMouseOut, onBodyScroll: hide, card }
    : { onCellMouseOver: undefined, onCellMouseOut: undefined, onBodyScroll: undefined, card };
}
