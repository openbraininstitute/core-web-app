import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  createDefaultOperatorRegistry,
  createInitialState,
  GridController,
  resolveColumns,
} from '@/features/data-grid/core';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { AgGridRenderer } from '@/features/data-grid/renderers/aggrid';
import { measureContentWidths } from '@/features/data-grid/renderers/aggrid/fit-columns';

import type { IGridSchema } from '@/features/data-grid/core';

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
];

const SCHEMA: IGridSchema<Row> = {
  id: 'test',
  getRowId: (r) => r.id,
  columns: [
    { id: 'name', header: 'Name', getValue: (r) => r.name, width: { fitContent: true } },
    { id: 'id', header: 'ID', getValue: (r) => r.id },
  ],
};

describe('measureContentWidths', () => {
  // It reads AG Grid's own markup, which a new version of the grid may name otherwise.
  it('finds a column’s header and cells in the grid as AG Grid draws it', async () => {
    const controller = new GridController<Row>({
      schema: SCHEMA,
      context: { dataType: 'test' },
      defaultPageSize: 20,
    });
    const { container } = render(
      <AgGridRenderer<Row>
        controller={controller}
        columns={resolveColumns(SCHEMA, controller.context)}
        rows={ROWS}
        total={ROWS.length}
        loading={false}
        state={createInitialState(SCHEMA, controller.context, 20)}
        operators={createDefaultOperatorRegistry()}
        cellRenderers={new CellRendererRegistry()}
      />
    );
    await waitFor(() => expect(container.textContent).toContain('Beta'));

    const widths = measureContentWidths(container, ['name', 'id', 'no-such-column']);

    expect([...widths.keys()]).toEqual(['name', 'id']);
    // the probe is taken out again
    expect(container.querySelector('form')).toBeNull();
  });
});
