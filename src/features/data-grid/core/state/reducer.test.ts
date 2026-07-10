import { describe, expect, it } from 'vitest';

import { createInitialState } from '../grid-controller';
import { reducer } from './reducer';

import type { GridSchema } from '../domain/schema';
import type { GridState } from './grid-state';

const schema: GridSchema<{ id: string }> = {
  id: 'test',
  columns: [
    { id: 'a', header: 'A' },
    { id: 'b', header: 'B' },
    { id: 'c', header: 'C', hiddenByDefault: true },
  ],
  getRowId: (r) => r.id,
};

function initial(): GridState {
  return createInitialState(schema, { dataType: 'test' }, 20);
}

describe('createInitialState', () => {
  it('derives column order and default-hidden columns from the schema', () => {
    const s = initial();
    expect(s.columnOrder).toEqual(['a', 'b', 'c']);
    expect(s.hiddenColumns).toEqual(['c']);
    expect(s.page).toBe(1);
    expect(s.pageSize).toBe(20);
    expect(s.columnWidths).toEqual({});
  });
});

describe('reducer — sort', () => {
  it('cycles none → desc → asc → none', () => {
    let s = initial();
    s = reducer(s, { type: 'toggleSort', columnId: 'a' });
    expect(s.sort).toEqual([{ columnId: 'a', direction: 'desc' }]);
    s = reducer(s, { type: 'toggleSort', columnId: 'a' });
    expect(s.sort).toEqual([{ columnId: 'a', direction: 'asc' }]);
    s = reducer(s, { type: 'toggleSort', columnId: 'a' });
    expect(s.sort).toEqual([]);
  });

  it('single-sort replaces other columns; multi-sort appends as tie-breaker', () => {
    let s = reducer(initial(), { type: 'toggleSort', columnId: 'a' });
    s = reducer(s, { type: 'toggleSort', columnId: 'b' });
    expect(s.sort).toEqual([{ columnId: 'b', direction: 'desc' }]);

    s = reducer(s, { type: 'toggleSort', columnId: 'a', allowMulti: true });
    expect(s.sort).toEqual([
      { columnId: 'a', direction: 'desc' },
      { columnId: 'b', direction: 'desc' },
    ]);
  });

  it('resets page and expansion on sort change', () => {
    let s = reducer(initial(), { type: 'setPage', page: 3 });
    s = reducer(s, { type: 'setExpanded', ids: ['r1'] });
    s = reducer(s, { type: 'toggleSort', columnId: 'a' });
    expect(s.page).toBe(1);
    expect(s.expanded).toEqual([]);
  });
});

describe('reducer — filters', () => {
  const entry = {
    columnId: 'a',
    operator: 'ilike',
    value: { kind: 'text', text: 'foo' },
  } as const;

  it('sets and clears a filter, resetting page and selection', () => {
    let s = reducer(initial(), { type: 'setPage', page: 2 });
    s = reducer(s, { type: 'setSelection', ids: ['r1'] });
    s = reducer(s, { type: 'setFilter', columnId: 'a', entry });
    expect(s.filters.a).toEqual(entry);
    expect(s.page).toBe(1);
    expect(s.selection).toEqual([]);

    s = reducer(s, { type: 'setFilter', columnId: 'a', entry: null });
    expect(s.filters).toEqual({});
  });

  it('returns the same reference for no-op transitions', () => {
    const s = initial();
    expect(reducer(s, { type: 'setFilter', columnId: 'a', entry: null })).toBe(s);
    expect(reducer(s, { type: 'clearFilters' })).toBe(s);
    expect(reducer(s, { type: 'setPage', page: 1 })).toBe(s);
    expect(reducer(s, { type: 'setPageSize', pageSize: 20 })).toBe(s);
    expect(reducer(s, { type: 'setQuickFilter', text: '' })).toBe(s);
  });

  it('clearFilters empties all filters and resets page', () => {
    let s = reducer(initial(), { type: 'setFilter', columnId: 'a', entry });
    s = reducer(s, { type: 'setPage', page: 4 });
    s = reducer(s, { type: 'clearFilters' });
    expect(s.filters).toEqual({});
    expect(s.page).toBe(1);
  });
});

describe('reducer — pagination', () => {
  it('setPageSize resets to page 1', () => {
    let s = reducer(initial(), { type: 'setPage', page: 5 });
    s = reducer(s, { type: 'setPageSize', pageSize: 50 });
    expect(s.pageSize).toBe(50);
    expect(s.page).toBe(1);
  });

  it('setPage keeps selection (cross-page bulk actions) but collapses expansion', () => {
    let s = reducer(initial(), { type: 'setSelection', ids: ['r1'] });
    s = reducer(s, { type: 'setExpanded', ids: ['r2'] });
    s = reducer(s, { type: 'setPage', page: 2 });
    expect(s.selection).toEqual(['r1']);
    expect(s.expanded).toEqual([]);
  });
});

describe('reducer — quick filter', () => {
  it('resets page and selection on text change', () => {
    let s = reducer(initial(), { type: 'setPage', page: 2 });
    s = reducer(s, { type: 'setSelection', ids: ['r1'] });
    s = reducer(s, { type: 'setQuickFilter', text: 'mouse' });
    expect(s.quickFilter).toBe('mouse');
    expect(s.page).toBe(1);
    expect(s.selection).toEqual([]);
  });
});

describe('reducer — column layout', () => {
  it('persable layout transitions: order, visibility, width', () => {
    let s = reducer(initial(), { type: 'setColumnOrder', order: ['b', 'a', 'c'] });
    expect(s.columnOrder).toEqual(['b', 'a', 'c']);
    s = reducer(s, { type: 'setHiddenColumns', hidden: ['a'] });
    expect(s.hiddenColumns).toEqual(['a']);
    s = reducer(s, { type: 'setColumnWidth', columnId: 'b', width: 240 });
    expect(s.columnWidths).toEqual({ b: 240 });
    expect(reducer(s, { type: 'setColumnWidth', columnId: 'b', width: 240 })).toBe(s);
  });
});

describe('reducer — expansion', () => {
  it('toggleExpanded adds and removes row ids', () => {
    let s = reducer(initial(), { type: 'toggleExpanded', id: 'r1' });
    expect(s.expanded).toEqual(['r1']);
    s = reducer(s, { type: 'toggleExpanded', id: 'r2' });
    expect(s.expanded).toEqual(['r1', 'r2']);
    s = reducer(s, { type: 'toggleExpanded', id: 'r1' });
    expect(s.expanded).toEqual(['r2']);
  });
});
