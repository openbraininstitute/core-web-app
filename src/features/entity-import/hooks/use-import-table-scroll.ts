'use client';

import { type RefObject, useCallback, useLayoutEffect, useRef } from 'react';

import { ENTITY_IMPORT_ALL_COLUMNS } from '@/features/entity-import/core/contracts';
import {
  fieldColumnWidth,
  ROW_ACTIONS_COLUMN_WIDTH,
  ROW_INDEX_COLUMN_WIDTH,
} from '@/features/entity-import/hooks/use-import-table-layout';

import type { TableRef } from 'antd/es/table';
import type { IAdapterFieldDefinition } from '@/features/entity-import/core/adapter';

/**
 * locate the scrollable table-body element inside an Ant Design `<Table>`
 *
 * depending on whether virtual mode is active the scrollable container is
 * either `.ant-table-body` or `.rc-virtual-list-holder` (if virtual is enabled)
 */
function findScrollableTableBody(tableRef: TableRef | null): HTMLDivElement | null {
  const element = tableRef?.nativeElement;
  if (!element) return null;

  return (
    (element.querySelector('.ant-table-body') as HTMLDivElement | null) ??
    (element.querySelector('.rc-virtual-list-holder') as HTMLDivElement | null) ??
    (element.querySelector('[class*="virtual-holder"]') as HTMLDivElement | null)
  );
}

interface UseImportTableScrollParams {
  /** Ref to the Ant Design `<Table>` instance */
  tableRef: RefObject<TableRef | null>;

  /** Adapter field definitions — used to compute column pixel offsets */
  fields: ReadonlyArray<Pick<IAdapterFieldDefinition, 'path' | 'columnWidth'>>;

  /** current column width overrides from drag-resize */
  resizeOverrides: Record<string, number>;

  /** total number of data rows currently in the session */
  rowCount: number;

  /**
   * the `fieldPath` of the column selected in the validator panel, or
   * `ENTITY_IMPORT_ALL_COLUMNS` when "All" is selected, or `null`/`undefined`
   * when nothing is selected.
   */
  selectedFieldPath: string | null | undefined;
}

interface UseImportTableScrollResult {
  /**
   * call this before adding a new row so the table scrolls to the bottom
   * after React commits the new row to the DOM
   */
  scrollToNewRowOnNextCommit: () => void;
}
/**
 * manages automatic scroll behaviour for the import table
 *
 * **Scroll to bottom** A new row is appended (via `scrollToNewRowOnNextCommit`)
 *
 * **Horizontal scroll-into-view** The user selects a column in the validator panel. The table scrolls horizontally so the selected column is fully visible, accounting for the fixed row-index and actions columns that overlay the edges
 */
export function useImportTableScroll({
  tableRef,
  fields,
  resizeOverrides,
  rowCount,
  selectedFieldPath,
}: UseImportTableScrollParams): UseImportTableScrollResult {
  const previousRowCountRef = useRef(rowCount);
  const shouldScrollToNewRowRef = useRef(false);
  const resizeOverridesRef = useRef(resizeOverrides);
  resizeOverridesRef.current = resizeOverrides;

  const scrollToNewRowOnNextCommit = useCallback(() => {
    shouldScrollToNewRowRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (shouldScrollToNewRowRef.current && rowCount > previousRowCountRef.current) {
      const tableBody = findScrollableTableBody(tableRef.current);
      if (tableBody) {
        tableBody.scrollTop = tableBody.scrollHeight;
      }
      shouldScrollToNewRowRef.current = false;
    }

    previousRowCountRef.current = rowCount;
  }, [rowCount, tableRef]);

  useLayoutEffect(() => {
    if (!selectedFieldPath || selectedFieldPath === ENTITY_IMPORT_ALL_COLUMNS) {
      return;
    }

    const tableBody = findScrollableTableBody(tableRef.current);
    if (!tableBody) {
      return;
    }

    const selectedFieldIndex = fields.findIndex((field) => field.path === selectedFieldPath);
    if (selectedFieldIndex < 0) {
      return;
    }

    const ro = resizeOverridesRef.current;

    // pixel offset of the target column's left edge relative to the start
    // of the scrollable content (after the fixed row-index column)
    const columnLeft =
      ROW_INDEX_COLUMN_WIDTH +
      fields
        .slice(0, selectedFieldIndex)
        .reduce((sum, field) => sum + fieldColumnWidth(field, ro), 0);

    const columnWidth = fieldColumnWidth(fields[selectedFieldIndex], ro);
    const columnRight = columnLeft + columnWidth;

    // the fixed left/right columns overlay the scrollable area, so the
    // *usable* viewport is narrower than `clientWidth`.
    const usableLeft = tableBody.scrollLeft + ROW_INDEX_COLUMN_WIDTH;
    const usableRight = tableBody.scrollLeft + tableBody.clientWidth - ROW_ACTIONS_COLUMN_WIDTH;

    if (columnLeft < usableLeft) {
      // column is (partially) hidden behind the fixed left column.
      tableBody.scrollLeft = columnLeft - ROW_INDEX_COLUMN_WIDTH;
    } else if (columnRight > usableRight) {
      // column is (partially) hidden behind the fixed right column.
      tableBody.scrollLeft = columnRight - tableBody.clientWidth + ROW_ACTIONS_COLUMN_WIDTH;
    }
    // `resizeOverrides` is read via ref so this effect does not rerun on every drag mousemove
    // (which would fight resize and snap horizontal scroll).
  }, [fields, selectedFieldPath, tableRef]);

  return { scrollToNewRowOnNextCommit };
}
