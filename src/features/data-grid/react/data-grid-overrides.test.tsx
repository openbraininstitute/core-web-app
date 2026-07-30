import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createDefaultOperatorRegistry, GridController, OperatorId } from '../core';
import { CellRendererRegistry } from './cell-renderer-registry';
import { DataGrid } from './data-grid';

import type { ReactNode } from 'react';
import type { GridDataSource, GridPage, GridQuery, GridSchema } from '../core';
import type { ExpandColumnConfig, GridRenderer, GridRendererProps } from './renderer';

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

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function controller() {
  return new GridController<Row>({ schema, context: { dataType: 't' }, defaultPageSize: 30 });
}

const dataSource: GridDataSource<Row> = {
  fetch: async (_q: GridQuery): Promise<GridPage<Row>> => ({ rows: [], total: 0 }),
};

describe('DataGrid — optional getRowClass / expandColumn passthrough (backward-compatible)', () => {
  it('forwards getRowClass and expandColumn to the renderer', async () => {
    let received: GridRendererProps<Row> | undefined;
    const spyRenderer: GridRenderer = (props) => {
      received = props as unknown as GridRendererProps<Row>;
      return null;
    };
    const getRowClass = (row: Row) => (row.id === 'x' ? 'dim' : undefined);
    const expandColumn: ExpandColumnConfig = { columnId: 'name', align: 'right' };

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
    let received: GridRendererProps<Row> | undefined;
    const spyRenderer: GridRenderer = (props) => {
      received = props as unknown as GridRendererProps<Row>;
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
    const nullRenderer: GridRenderer = () => null;
    const { getByTestId } = wrap(
      <DataGrid
        controller={controller()}
        dataSource={dataSource}
        renderer={nullRenderer}
        operators={createDefaultOperatorRegistry()}
        cellRenderers={new CellRendererRegistry()}
        queryKey={['t']}
        toolbarSlots={{ right: <div data-testid="plugin-slot">toggle</div> }}
        showColumnChooser={false}
      />
    );
    await waitFor(() => expect(getByTestId('plugin-slot')).toBeTruthy());
  });
});
