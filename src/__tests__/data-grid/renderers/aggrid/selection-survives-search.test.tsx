/**
 * Regression for the picker's whole point: keeping picks across a search.
 *
 * Dropping the reducer's selection reset is not enough on its own. When selected rows
 * leave `rowData`, AG Grid fires `selectionChanged` with source `rowDataChanged` BEFORE
 * `onRowDataUpdated` re-applies the store selection to the new nodes — so merging that
 * event sees "nothing selected on this page" and drops every id the new page carries.
 * The reducer tests never go through AG Grid, which is why this one exists.
 */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  createDefaultOperatorRegistry,
  GridActionType,
  GridController,
  resolveColumns,
} from '@/features/data-grid/core';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { AgGridRenderer } from '@/features/data-grid/renderers/aggrid';

import type { IGridSchema } from '@/features/data-grid/core';

interface Row {
  id: string;
  name: string;
}

const A: Row = { id: 'a', name: 'Alpha' };
const B: Row = { id: 'b', name: 'Beta' };

const SCHEMA: IGridSchema<Row> = {
  id: 'test',
  getRowId: (r) => r.id,
  selection: { enabled: true, mode: 'multiRow' },
  columns: [{ id: 'name', header: 'Name', getValue: (r) => r.name }],
};

function makeView(controller: GridController<Row>, mode: 'single' | 'multiRow') {
  return (rows: Row[]) => (
    <AgGridRenderer<Row>
      controller={controller}
      columns={resolveColumns(SCHEMA, controller.context)}
      rows={rows}
      total={rows.length}
      loading={false}
      state={controller.store.getSnapshot()}
      operators={createDefaultOperatorRegistry()}
      cellRenderers={new CellRendererRegistry()}
      selectionEnabled
      selectionModeOverride={mode}
    />
  );
}

function makeController() {
  return new GridController<Row>({
    schema: SCHEMA,
    context: { dataType: 'test' },
    defaultPageSize: 20,
  });
}

describe('AgGridRenderer — selection survives rows leaving the page', () => {
  it('single picker keeps its pick when a search hides the picked row', async () => {
    const controller = makeController();
    const view = makeView(controller, 'single');
    controller.store.dispatch({ type: GridActionType.SetSelection, ids: ['a'] });

    const { container, rerender } = render(view([A, B]));
    await waitFor(() => expect(container.textContent).toContain('Alpha'));

    // search "b": Alpha's selected node is removed, which fires `selectionChanged` with
    // source `rowDataChanged` and nothing selected on the page. In single mode the merge
    // REPLACES the whole selection, so acting on that event clears the host's pick.
    rerender(view([B]));
    await waitFor(() => expect(container.textContent).not.toContain('Alpha'));
    expect(controller.store.getSnapshot().selection).toEqual(['a']);

    // clearing the search brings it back, still picked
    rerender(view([A, B]));
    await waitFor(() => expect(container.textContent).toContain('Alpha'));
    expect(controller.store.getSnapshot().selection).toEqual(['a']);
  });

  it('multi picker keeps off-page picks across a search', async () => {
    const controller = makeController();
    const view = makeView(controller, 'multiRow');
    controller.store.dispatch({ type: GridActionType.SetSelection, ids: ['a'] });

    const { container, rerender } = render(view([A, B]));
    await waitFor(() => expect(container.textContent).toContain('Alpha'));

    rerender(view([B]));
    await waitFor(() => expect(container.textContent).not.toContain('Alpha'));
    expect(controller.store.getSnapshot().selection).toEqual(['a']);

    controller.store.dispatch({ type: GridActionType.SetSelection, ids: ['a', 'b'] });
    rerender(view([A, B]));
    await waitFor(() => expect(container.textContent).toContain('Alpha'));
    expect([...controller.store.getSnapshot().selection].sort()).toEqual(['a', 'b']);
  });
});
