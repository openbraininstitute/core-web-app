import { useState } from 'react';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { GridController } from '../core';

export interface BulkActionsRenderArgs<Row> {
  /** ids of the currently selected rows (across pages) */
  selectedIds: string[];
  /** full selected rows, including rows selected on OTHER pages (legacy parity) */
  selectedRows: Row[];
  clearSelection: () => void;
}

export interface BulkActionsProps<Row> {
  controller: GridController<Row>;
  rows: Row[];
  selection: string[];
  /** host-provided actions (download / delete buttons) receiving the selection */
  children: (args: BulkActionsRenderArgs<Row>) => ReactNode;
  className?: string;
}

/**
 * Merge the rows seen on the current page into the cross-page cache, pruning
 * entries that are neither selected nor on the page (bounded memory). Pure, so the
 * accumulation semantics — the legacy `use-row-selection` behavior of keeping full
 * row objects for selections made on other pages — stay unit-testable.
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
 * Bridges the store's selection to host-owned bulk-action buttons. Selection is
 * cross-page (ids live in the store); this component keeps an id→row cache of the
 * pages it has seen so the buttons receive FULL rows for every selected id — the
 * same semantics as the legacy antd `use-row-selection`. Renders nothing until at
 * least one row is selected, keeping the toolbar quiet by default.
 */
export function BulkActions<Row>({
  controller,
  rows,
  selection,
  children,
  className,
}: BulkActionsProps<Row>) {
  const getRowId = controller.schema.getRowId;

  // Canonical "derive state from props during render" pattern: when the page's
  // rows change, fold them into the cache (and prune) before the next paint.
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
        clearSelection: () => controller.store.dispatch({ type: 'setSelection', ids: [] }),
      })}
    </div>
  );
}
