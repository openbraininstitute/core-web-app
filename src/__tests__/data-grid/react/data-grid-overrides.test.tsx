import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Align,
  createDefaultOperatorRegistry,
  GridController,
  OperatorId,
} from '@/features/data-grid/core';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { DataGrid } from '@/features/data-grid/react/data-grid';

import type { ReactNode } from 'react';
import type {
  IGridDataSource,
  IGridPage,
  IGridQuery,
  IGridSchema,
} from '@/features/data-grid/core';
import type {
  IExpandColumnConfig,
  IGridRendererProps,
  TGridRenderer,
} from '@/features/data-grid/react/renderer';

interface Row {
  id: string;
  name: string;
}

const schema: IGridSchema<Row> = {
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

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function controller() {
  return new GridController<Row>({ schema, context: { dataType: 't' }, defaultPageSize: 30 });
}

const dataSource: IGridDataSource<Row> = {
  fetch: async (_q: IGridQuery): Promise<IGridPage<Row>> => ({ rows: [], total: 0 }),
};

describe('DataGrid — optional getRowClass / expandColumn passthrough (backward-compatible)', () => {
  it('forwards getRowClass and expandColumn to the renderer', async () => {
    let received: IGridRendererProps<Row> | undefined;
    const spyRenderer: TGridRenderer = (props) => {
      received = props as unknown as IGridRendererProps<Row>;
      return null;
    };
    const getRowClass = (row: Row) => (row.id === 'x' ? 'dim' : undefined);
    const expandColumn: IExpandColumnConfig = { columnId: 'name', align: Align.Right };

    wrap(
      <DataGrid
        controller={controller()}
        dataSource={dataSource}
        renderer={spyRenderer}
        operators={createDefaultOperatorRegistry()}
        cellRenderers={new CellRendererRegistry()}
        queryKey={['t']}
        getRowClass={getRowClass}
        expandColumn={expandColumn}
        showColumnChooser={false}
      />
    );

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.getRowClass).toBe(getRowClass);
    expect(received?.expandColumn).toBe(expandColumn);
  });

  it('omitting them leaves the renderer props undefined (unchanged default)', async () => {
    let received: IGridRendererProps<Row> | undefined;
    const spyRenderer: TGridRenderer = (props) => {
      received = props as unknown as IGridRendererProps<Row>;
      return null;
    };

    wrap(
      <DataGrid
        controller={controller()}
        dataSource={dataSource}
        renderer={spyRenderer}
        operators={createDefaultOperatorRegistry()}
        cellRenderers={new CellRendererRegistry()}
        queryKey={['t']}
        showColumnChooser={false}
      />
    );

    await waitFor(() => expect(received).toBeDefined());
    expect(received?.getRowClass).toBeUndefined();
    expect(received?.expandColumn).toBeUndefined();
  });

  it('merges host-supplied toolbar slots into the toolbar', async () => {
    const nullRenderer: TGridRenderer = () => null;
    const { getByTestId } = wrap(
      <DataGrid
        controller={controller()}
        dataSource={dataSource}
        renderer={nullRenderer}
        operators={createDefaultOperatorRegistry()}
        cellRenderers={new CellRendererRegistry()}
        queryKey={['t']}
        toolbarSlots={{ left: <div data-testid="plugin-slot">toggle</div> }}
        showColumnChooser={false}
      />
    );
    await waitFor(() => expect(getByTestId('plugin-slot')).toBeTruthy());
  });
});
