'use client';

import { type RefObject, useCallback, useLayoutEffect, useRef } from 'react';

import type { TableRef } from 'antd/es/table';

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

  /** total number of data rows currently in the session */
  rowCount: number;

  /** selected row id in validator panel, if any */
  selectedRowId: string | null | undefined;
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
 * **Scroll to bottom** when a new row is appended (via `scrollToNewRowOnNextCommit`)
 *
 * **Scroll to row** when the user selects a row in the validator panel
 */
export function useImportTableScroll({
  tableRef,
  rowCount,
  selectedRowId,
}: UseImportTableScrollParams): UseImportTableScrollResult {
  const previousRowCountRef = useRef(rowCount);
  const shouldScrollToNewRowRef = useRef(false);

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
    if (selectedRowId) {
      tableRef.current?.scrollTo({ key: selectedRowId });
    }
  }, [selectedRowId, tableRef]);

  return { scrollToNewRowOnNextCommit };
}
