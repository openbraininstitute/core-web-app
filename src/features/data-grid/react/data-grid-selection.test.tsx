import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultOperatorRegistry, GridController } from '../core';
import { CellRendererRegistry } from './cell-renderer-registry';
import { DataGrid, type DataGridSelection } from './data-grid';

import type { ReactNode } from 'react';
import type { GridDataSource, GridPage, GridQuery, GridSchema } from '../core';
import type { GridRenderer, GridRendererProps } from './renderer';

interface Row {
  id: string;
  name: string;
}

const schema: GridSchema<Row> = {
  id: 't',
  getRowId: (r) => r.id,
  columns: [{ id: 'name', header: 'Name', getValue: (r) => r.name }],
};

const ROWS: Row[] = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
];

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function setup(opts?: { selection?: DataGridSelection<Row>; rows?: Row[] }) {
  const controller = new GridController<Row>({
    schema,
    context: { dataType: 't' },
    defaultPageSize: 30,
  });
  const rows = opts?.rows ?? ROWS;
  const fetch = vi.fn(
    async (_q: GridQuery): Promise<GridPage<Row>> => ({ rows, total: rows.length })
  );
  const dataSource: GridDataSource<Row> = { fetch };
  let received: GridRendererProps<Row> | undefined;
  const spyRenderer: GridRenderer = (props) => {
    received = props as unknown as GridRendererProps<Row>;
    return null;
  };
  wrap(
    <DataGrid
      controller={controller}
      dataSource={dataSource}
      renderer={spyRenderer}
      operators={createDefaultOperatorRegistry()}
      cellRenderers={new CellRendererRegistry()}
      queryKey={['t']}
      showColumnChooser={false}
      selection={opts?.selection}
    />
  );
  return { controller, getReceived: () => received };
}

describe('DataGrid picker selection', () => {
  it('single (radio) forces selection on and forwards mode "single" to the renderer', async () => {
    const { getReceived } = setup({ selection: { mode: 'single', onChange: vi.fn() } });
    await waitFor(() => expect(getReceived()).toBeDefined());
    expect(getReceived()?.selectionEnabled).toBe(true);
    expect(getReceived()?.selectionModeOverride).toBe('single');
  });

  it('multi (checkbox) forces selection on and forwards mode "multiRow"', async () => {
    const { getReceived } = setup({ selection: { mode: 'multi', onChange: vi.fn() } });
    await waitFor(() => expect(getReceived()).toBeDefined());
    expect(getReceived()?.selectionEnabled).toBe(true);
    expect(getReceived()?.selectionModeOverride).toBe('multiRow');
  });

  it('non-picker mode: no override, selection stays schema-driven (off here)', async () => {
    const { getReceived } = setup();
    await waitFor(() => expect(getReceived()).toBeDefined());
    expect(getReceived()?.selectionModeOverride).toBeUndefined();
    expect(getReceived()?.selectionEnabled).toBe(false);
  });

  it('does NOT emit onChange on mount (parity: only user-driven changes)', async () => {
    const onChange = vi.fn();
    const { getReceived } = setup({ selection: { mode: 'multi', onChange } });
    await waitFor(() => expect(getReceived()).toBeDefined());
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('multi: propagates selected rows and accumulates as the store selection grows', async () => {
    const onChange = vi.fn();
    const { controller, getReceived } = setup({ selection: { mode: 'multi', onChange } });
    await waitFor(() => expect(getReceived()).toBeDefined());
    // rows are loaded → cache populated; simulate the renderer's grid→store dispatch
    act(() => controller.store.dispatch({ type: 'setSelection', ids: ['a'] }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([{ id: 'a', name: 'A' }]));
    act(() => controller.store.dispatch({ type: 'setSelection', ids: ['a', 'b'] }));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ])
    );
  });

  it('single: emits one row and replaces on the next pick', async () => {
    const onChange = vi.fn();
    const { controller, getReceived } = setup({ selection: { mode: 'single', onChange } });
    await waitFor(() => expect(getReceived()).toBeDefined());
    act(() => controller.store.dispatch({ type: 'setSelection', ids: ['a'] }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([{ id: 'a', name: 'A' }]));
    act(() => controller.store.dispatch({ type: 'setSelection', ids: ['b'] }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([{ id: 'b', name: 'B' }]));
  });

  it('controlled: seeds the store from selectedRows so the grid mirrors the parent picks', async () => {
    const onChange = vi.fn();
    const { controller, getReceived } = setup({
      selection: { mode: 'multi', selectedRows: [{ id: 'a', name: 'A' }], onChange },
    });
    await waitFor(() => expect(getReceived()).toBeDefined());
    await waitFor(() => expect(controller.store.getSnapshot().selection).toEqual(['a']));
    // a later user-driven change still resolves BOTH rows (controlled row seeded the cache)
    act(() => controller.store.dispatch({ type: 'setSelection', ids: ['a', 'b'] }));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ])
    );
  });
});
