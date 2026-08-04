import { useState } from 'react';

import { cn } from '@/utils/css-class';

import { GridActionType } from '../core';

import type { ReactNode } from 'react';
import type { GridController } from '../core';

export interface IBulkActionsRenderArgs<Row> {
  /** ids of the currently selected rows (across pages) */
  selectedIds: string[];
  /** full selected rows, including rows selected on other pages */
  selectedRows: Row[];
  clearSelection: () => void;
}

export interface IBulkActionsProps<Row> {
  controller: GridController<Row>;
  rows: Row[];
  selection: string[];
  /** host-provided actions (download / delete buttons) receiving the selection */
  children: (args: IBulkActionsRenderArgs<Row>) => ReactNode;
  className?: string;
}

/**
 * Merge the current page's rows into the cross-page cache, pruning entries that are
 * neither selected nor on the page so memory stays bounded. Pure, hence testable.
 */
export function accumulateSeenRows<Row>(
  cache: ReadonlyMap<string, Row>,
  rows: Row[],
  selection: ReadonlyArray<string>,
  getRowId: (row: Row) => string
): Map<string, Row> {
  const selected = new Set(selection);
  const next = new Map<string, Row>();
  for (const [id, row] of cache) {
    if (selected.has(id)) next.set(id, row);
  }
  for (const row of rows) {
    next.set(getRowId(row), row);
  }
  return next;
}

/**
 * Bridges the store's id-only, cross-page selection to host-owned bulk-action buttons,
 * keeping an id→row cache so they receive full rows. Renders nothing until a row is
 * selected.
 */
export function BulkActions<Row>({
  controller,
  rows,
  selection,
  children,
  className,
}: IBulkActionsProps<Row>) {
  const getRowId = controller.schema.getRowId;

  // "Derive state from props during render": fold new rows into the cache before paint.
  const [cache, setCache] = useState<ReadonlyMap<string, Row>>(() => new Map());
  const [prevRows, setPrevRows] = useState<Row[]>();
  if (prevRows !== rows) {
    setPrevRows(rows);
    setCache(accumulateSeenRows(cache, rows, selection, getRowId));
  }

  if (selection.length === 0) return null;

  const selectedRows = selection
    .map((id) => cache.get(id))
    .filter((row): row is Row => row !== undefined);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children({
        selectedIds: selection,
        selectedRows,
        clearSelection: () =>
          controller.store.dispatch({ type: GridActionType.SetSelection, ids: [] }),
      })}
    </div>
  );
}
