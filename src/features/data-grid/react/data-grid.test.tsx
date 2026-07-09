import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultOperatorRegistry, GridController, OperatorId } from '../core';
import { CellRendererRegistry } from './cell-renderer-registry';
import { DataGrid } from './data-grid';

import type { ReactNode } from 'react';
import type { GridDataSource, GridPage, GridQuery, GridSchema } from '../core';
import type { GridRenderer } from './renderer';

interface Row {
  id: string;
  name: string;
}

const schema: GridSchema<Row> = {
  id: 't',
  getRowId: (r) => r.id,
  columns: [
    {
      id: 'name',
      header: 'Name',
      getValue: (r) => r.name,
      filter: { operators: [OperatorId.Ilike], field: 'name' },
    },
  ],
};

const nullRenderer: GridRenderer = () => null;

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function setup() {
  const controller = new GridController<Row>({
    schema,
    context: { dataType: 't' },
    defaultPageSize: 30,
  });
  const fetch = vi.fn(async (_q: GridQuery): Promise<GridPage<Row>> => ({ rows: [], total: 100 }));
  const dataSource: GridDataSource<Row> = { fetch };
  wrap(
    <DataGrid
      controller={controller}
      dataSource={dataSource}
      renderer={nullRenderer}
      operators={createDefaultOperatorRegistry()}
      cellRenderers={new CellRendererRegistry()}
      queryKey={['t']}
      showColumnChooser={false}
    />
  );
  return { controller, fetch };
}

describe('DataGrid refetch wiring', () => {
  it('fetches page 1 on mount', async () => {
    const { fetch } = setup();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch.mock.calls[0][0].page).toBe(1);
    expect(fetch.mock.calls[0][0].pageSize).toBe(30);
  });

  it('refetches when the page changes', async () => {
    const { controller, fetch } = setup();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    act(() => controller.store.dispatch({ type: 'setPage', page: 2 }));
    await waitFor(() => expect(fetch.mock.calls.some((c) => c[0].page === 2)).toBe(true));
  });

  it('refetches at page 1 when the page size changes', async () => {
    const { controller, fetch } = setup();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    act(() => controller.store.dispatch({ type: 'setPage', page: 3 }));
    await waitFor(() => expect(fetch.mock.calls.some((c) => c[0].page === 3)).toBe(true));
    act(() => controller.store.dispatch({ type: 'setPageSize', pageSize: 50 }));
    await waitFor(() =>
      expect(fetch.mock.calls.some((c) => c[0].pageSize === 50 && c[0].page === 1)).toBe(true)
    );
  });

  it('refetches when a filter is set', async () => {
    const { controller, fetch } = setup();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    act(() =>
      controller.store.dispatch({
        type: 'setFilter',
        columnId: 'name',
        entry: {
          columnId: 'name',
          operator: OperatorId.Ilike,
          value: { kind: 'text', text: 'foo' },
        },
      })
    );
    await waitFor(() => expect(fetch.mock.calls.some((c) => 'name' in c[0].filters)).toBe(true));
  });

  it('does NOT refetch on a pure selection change (no query-affecting state)', async () => {
    const { controller, fetch } = setup();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const callsBefore = fetch.mock.calls.length;
    act(() => controller.store.dispatch({ type: 'setSelection', ids: ['a', 'b'] }));
    // give any spurious refetch a chance to fire
    await new Promise((r) => setTimeout(r, 20));
    expect(fetch.mock.calls.length).toBe(callsBefore);
  });
});
