import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { GridController } from '../core';

export interface BulkActionsRenderArgs<Row> {
  /** ids of the currently selected rows */
  selectedIds: string[];
  /** selected rows that are present on the current page (bulk handlers may need the full rows) */
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
 * Bridges the store's selection to host-owned bulk-action buttons. Renders nothing
 * until at least one row is selected, keeping the toolbar quiet by default.
 */
export function BulkActions<Row>({
  controller,
  rows,
  selection,
  children,
  className,
}: BulkActionsProps<Row>) {
  if (selection.length === 0) return null;

  const selectedSet = new Set(selection);
  const selectedRows = rows.filter((row) => selectedSet.has(controller.schema.getRowId(row)));

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
