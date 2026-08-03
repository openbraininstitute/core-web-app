/**
 * The grid's FOOTER: bulk actions on the left, pagination in the middle, the results
 * count and the selection status on the right. Asserted as DOM order inside the one
 * footer row — the visual arrangement is flexbox on that same order, so order is the
 * honest thing to pin in jsdom, and it is what a keyboard user traverses.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  createDefaultOperatorRegistry,
  GridActionType,
  GridController,
} from '@/features/data-grid/core';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { DataGrid } from '@/features/data-grid/react/data-grid';

import type {
  IGridDataSource,
  IGridPage,
  IGridQuery,
  IGridSchema,
} from '@/features/data-grid/core';
import type { TGridRenderer } from '@/features/data-grid/react/renderer';

interface Row {
  id: string;
  name: string;
}

const schema: IGridSchema<Row> = {
  id: 't',
  getRowId: (r) => r.id,
  selection: { enabled: true },
  columns: [{ id: 'name', header: 'Name', getValue: (r) => r.name }],
};

const nullRenderer: TGridRenderer = () => null;

function setup() {
  const controller = new GridController<Row>({
    schema,
    context: { dataType: 't' },
    defaultPageSize: 30,
  });
  const fetch = vi.fn(
    async (_q: IGridQuery): Promise<IGridPage<Row>> => ({
      rows: [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
      ],
      total: 100,
    })
  );
  const dataSource: IGridDataSource<Row> = { fetch };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={qc}>
      <DataGrid
        controller={controller}
        dataSource={dataSource}
        renderer={nullRenderer}
        operators={createDefaultOperatorRegistry()}
        cellRenderers={new CellRendererRegistry()}
        queryKey={['t']}
        showColumnChooser={false}
        renderCount={({ total }) => <span data-testid="results-count">{total} results</span>}
        renderBulkActions={() => <button data-testid="bulk-download" type="button" />}
      />
    </QueryClientProvider>
  );
  return { controller, fetch, utils };
}

describe('DataGrid footer', () => {
  it('orders bulk actions, then pagination, then the counts', async () => {
    const { controller } = setup();
    await waitFor(() => expect(screen.getByTestId('results-count')).toBeInTheDocument());
    act(() => controller.store.dispatch({ type: GridActionType.SetSelection, ids: ['a'] }));

    const bulk = await screen.findByTestId('bulk-download');
    const count = screen.getByTestId('results-count');
    const footer = count.closest('div.flex-wrap');
    expect(footer).not.toBeNull();
    expect(footer?.contains(bulk)).toBe(true);

    // bulk actions come before the count in document order (left → right)
    expect(bulk.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // the selection status sits with the count on the right, not with the actions
    const selected = screen.getByText('1 selected');
    expect(selected.compareDocumentPosition(bulk) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('keeps the bulk actions out of the toolbar', async () => {
    const { controller } = setup();
    await waitFor(() => expect(screen.getByTestId('results-count')).toBeInTheDocument());
    act(() => controller.store.dispatch({ type: GridActionType.SetSelection, ids: ['a'] }));

    const bulk = await screen.findByTestId('bulk-download');
    expect(bulk.closest('[data-testid="data-grid-toolbar"]')).toBeNull();
  });
});
