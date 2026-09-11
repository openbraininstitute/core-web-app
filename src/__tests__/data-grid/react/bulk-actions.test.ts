import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { GridController } from '@/features/data-grid/core';
import {
  accumulateSeenRows,
  BulkActions,
  countSelectionInScope,
} from '@/features/data-grid/react/bulk-actions';

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

describe('countSelectionInScope', () => {
  it('counts the current scope while keeping the selection basket shared', () => {
    const scopes = new Map([
      ['public-row', 'public'],
      ['project-row-1', 'project'],
      ['project-row-2', 'project'],
    ]);

    expect(
      countSelectionInScope(['public-row', 'project-row-1', 'project-row-2'], scopes, 'public')
    ).toBe(1);
    expect(
      countSelectionInScope(['public-row', 'project-row-1', 'project-row-2'], scopes, 'project')
    ).toBe(2);
  });

  it('counts the whole basket when no scope is supplied', () => {
    expect(countSelectionInScope(['a', 'b'], new Map(), undefined)).toBe(2);
  });

  it('passes the full cross-scope basket while preserving the current-scope count', () => {
    const controller = new GridController<Row>({
      schema: {
        id: 'bulk-actions',
        getRowId,
        columns: [{ id: 'name', header: 'Name', getValue: (r) => r.name }],
      },
      context: { dataType: 'test' },
      defaultPageSize: 30,
    });
    const renders: Array<{
      selectedIds: string[];
      selectedRows: Row[];
      selectedCount: number;
    }> = [];

    const renderActions = (rows: Row[], selection: string[]) =>
      createElement(BulkActions<Row>, { controller, rows, selection, selectedCount: 1 }, (args) => {
        renders.push(args);
        return null;
      });

    const { rerender } = render(renderActions([row('public')], ['public']));
    rerender(renderActions([row('project')], ['public', 'project']));

    expect(renders.at(-1)?.selectedIds).toEqual(['public', 'project']);
    expect(renders.at(-1)?.selectedRows.map((r) => r.id)).toEqual(['public', 'project']);
    expect(renders.at(-1)?.selectedCount).toBe(1);
  });
});
