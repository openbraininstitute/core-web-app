import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useImportTableScroll } from '@/features/entity-import/hooks/use-import-table-scroll';

import type { TableRef } from 'antd/es/table';
import type { RefObject } from 'react';

interface UseImportTableScrollHarnessProps {
  tableRef: RefObject<TableRef | null>;
  selectedRowId: string | null;
}

function UseImportTableScrollHarness({
  tableRef,
  selectedRowId,
}: UseImportTableScrollHarnessProps) {
  useImportTableScroll({
    tableRef,
    rowCount: 10,
    selectedRowId,
  });

  return null;
}

function createVirtualTableRef() {
  const nativeElement = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'ant-table-header';
  nativeElement.appendChild(header);

  document.body.appendChild(nativeElement);

  const scrollTo = vi.fn();
  const tableRef = {
    current: {
      nativeElement,
      scrollTo,
    } as unknown as TableRef,
  } as RefObject<TableRef | null>;

  return { tableRef, scrollTo, nativeElement };
}

describe('useImportTableScroll', () => {
  it('scrolls the table body when the selected row changes', () => {
    const { tableRef, scrollTo } = createVirtualTableRef();
    const { rerender, unmount } = render(
      <UseImportTableScrollHarness tableRef={tableRef} selectedRowId="row-1" />
    );

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith({ key: 'row-1' });

    rerender(<UseImportTableScrollHarness tableRef={tableRef} selectedRowId="row-10" />);

    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ key: 'row-10' });

    unmount();
  });

  it('does not re-scroll when selectedRowId stays the same', () => {
    const { tableRef, scrollTo } = createVirtualTableRef();
    const { rerender, unmount } = render(
      <UseImportTableScrollHarness tableRef={tableRef} selectedRowId="row-1" />
    );

    expect(scrollTo).toHaveBeenCalledTimes(1);

    rerender(<UseImportTableScrollHarness tableRef={tableRef} selectedRowId="row-1" />);

    expect(scrollTo).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('does not scroll when selectedRowId is null', () => {
    const { tableRef, scrollTo } = createVirtualTableRef();
    const { unmount } = render(
      <UseImportTableScrollHarness tableRef={tableRef} selectedRowId={null} />
    );

    expect(scrollTo).not.toHaveBeenCalled();

    unmount();
  });
});
