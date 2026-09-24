import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GridActionType, GridController } from '@/features/data-grid/core';
import { accumulateSeenRows, BulkActions } from '@/features/data-grid/react/bulk-actions';

import type { IBulkActionsRenderArgs } from '@/features/data-grid/react/bulk-actions';

type Row = { id: string; name: string };

const getRowId = (r: Row) => r.id;
const row = (id: string): Row => ({ id, name: `row-${id}` });

describe('accumulateSeenRows — cross-page selection cache (legacy use-row-selection parity)', () => {
  it('caches the current page rows', () => {
    const cache = accumulateSeenRows(new Map(), [row('a'), row('b')], [], getRowId);
    expect([...cache.keys()]).toEqual(['a', 'b']);
  });

  it('keeps rows selected on a previous page after paginating away', () => {
    const page1 = accumulateSeenRows(new Map(), [row('a'), row('b')], [], getRowId);
    // user selects `a`, then navigates to page 2
    const page2 = accumulateSeenRows(page1, [row('c'), row('d')], ['a'], getRowId);
    expect(page2.get('a')?.name).toBe('row-a');
    expect([...page2.keys()].sort()).toEqual(['a', 'c', 'd']);
  });

  it('prunes rows that are neither selected nor on the current page (bounded memory)', () => {
    const page1 = accumulateSeenRows(new Map(), [row('a'), row('b')], [], getRowId);
    const page2 = accumulateSeenRows(page1, [row('c')], [], getRowId);
    expect([...page2.keys()]).toEqual(['c']);
  });

  it('refreshes a cached row with the latest data when it reappears on a page', () => {
    const stale = new Map([['a', { id: 'a', name: 'stale' }]]);
    const cache = accumulateSeenRows(stale, [row('a')], ['a'], getRowId);
    expect(cache.get('a')?.name).toBe('row-a');
  });
});

describe('BulkActions', () => {
  const makeController = () =>
    new GridController<Row>({
      schema: {
        id: 'bulk-actions',
        getRowId,
        columns: [{ id: 'name', header: 'Name', getValue: (r) => r.name }],
      },
      context: { dataType: 'test' },
      defaultPageSize: 30,
    });

  const renderActions = (
    controller: GridController<Row>,
    rows: Row[],
    selection: string[],
    onRender: (args: IBulkActionsRenderArgs<Row>) => void
  ) => (
    <BulkActions<Row>
      controller={controller}
      rows={rows}
      selection={selection}
      selectedCount={selection.length}
    >
      {(args) => {
        onRender(args);
        return null;
      }}
    </BulkActions>
  );

  it('passes the full cross-scope basket, and one count that matches it', () => {
    const controller = makeController();
    const renders: Array<IBulkActionsRenderArgs<Row>> = [];
    const push = (args: IBulkActionsRenderArgs<Row>) => renders.push(args);

    const { rerender } = render(renderActions(controller, [row('public')], ['public'], push));
    rerender(renderActions(controller, [row('project')], ['public', 'project'], push));

    expect(renders.at(-1)?.selectedIds).toEqual(['public', 'project']);
    expect(renders.at(-1)?.selectedRows.map((r) => r.id)).toEqual(['public', 'project']);
    // the badge number can never disagree with the rows the action receives
    expect(renders.at(-1)?.selectedCount).toBe(renders.at(-1)?.selectedRows.length);
  });

  it('deselectRows drops only the given ids, leaving the rest of the basket', () => {
    const controller = makeController();
    const renders: Array<IBulkActionsRenderArgs<Row>> = [];
    const push = (args: IBulkActionsRenderArgs<Row>) => renders.push(args);

    controller.store.dispatch({ type: GridActionType.SetSelection, ids: ['public', 'project'] });
    render(renderActions(controller, [row('public'), row('project')], ['public', 'project'], push));

    renders.at(-1)?.deselectRows(['project']);

    expect(controller.store.getSnapshot().selection).toEqual(['public']);
  });
});
