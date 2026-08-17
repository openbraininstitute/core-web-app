import { describe, expect, it } from 'vitest';

import { FilterValueKind } from '@/features/data-grid/core/domain/filter-model';
import { SortDirection } from '@/features/data-grid/core/domain/sort-model';
import { createInitialState } from '@/features/data-grid/core/grid-controller';
import { GridActionType } from '@/features/data-grid/core/state/grid-state';
import { reducer } from '@/features/data-grid/core/state/reducer';

import type { IGridSchema } from '@/features/data-grid/core/domain/schema';
import type { IGridState } from '@/features/data-grid/core/state/grid-state';

const schema: IGridSchema<{ id: string }> = {
  id: 'test',
  columns: [
    { id: 'a', header: 'A' },
    { id: 'b', header: 'B' },
    { id: 'c', header: 'C', hiddenByDefault: true },
  ],
  getRowId: (r) => r.id,
};

function initial(): IGridState {
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
    s = reducer(s, { type: GridActionType.ToggleSort, columnId: 'a' });
    expect(s.sort).toEqual([{ columnId: 'a', direction: SortDirection.Desc }]);
    s = reducer(s, { type: GridActionType.ToggleSort, columnId: 'a' });
    expect(s.sort).toEqual([{ columnId: 'a', direction: SortDirection.Asc }]);
    s = reducer(s, { type: GridActionType.ToggleSort, columnId: 'a' });
    expect(s.sort).toEqual([]);
  });

  it('single-sort replaces other columns; multi-sort appends as tie-breaker', () => {
    let s = reducer(initial(), { type: GridActionType.ToggleSort, columnId: 'a' });
    s = reducer(s, { type: GridActionType.ToggleSort, columnId: 'b' });
    expect(s.sort).toEqual([{ columnId: 'b', direction: SortDirection.Desc }]);

    s = reducer(s, { type: GridActionType.ToggleSort, columnId: 'a', allowMulti: true });
    expect(s.sort).toEqual([
      { columnId: 'a', direction: SortDirection.Desc },
      { columnId: 'b', direction: SortDirection.Desc },
    ]);
  });

  it('resets page and expansion on sort change', () => {
    let s = reducer(initial(), { type: GridActionType.SetPage, page: 3 });
    s = reducer(s, { type: GridActionType.SetExpanded, ids: ['r1'] });
    s = reducer(s, { type: GridActionType.ToggleSort, columnId: 'a' });
    expect(s.page).toBe(1);
    expect(s.expanded).toEqual([]);
  });
});

describe('reducer — filters', () => {
  const entry = {
    columnId: 'a',
    operator: 'ilike',
    value: { kind: FilterValueKind.Text, text: 'foo' },
  } as const;

  it('sets and clears a filter, resetting page and selection', () => {
    let s = reducer(initial(), { type: GridActionType.SetPage, page: 2 });
    s = reducer(s, { type: GridActionType.SetSelection, ids: ['r1'] });
    s = reducer(s, { type: GridActionType.SetFilter, columnId: 'a', entry });
    expect(s.filters.a).toEqual(entry);
    expect(s.page).toBe(1);
    expect(s.selection).toEqual([]);

    s = reducer(s, { type: GridActionType.SetFilter, columnId: 'a', entry: null });
    expect(s.filters).toEqual({});
  });

  it('returns the same reference for no-op transitions', () => {
    const s = initial();
    expect(reducer(s, { type: GridActionType.SetFilter, columnId: 'a', entry: null })).toBe(s);
    expect(reducer(s, { type: GridActionType.ClearFilters })).toBe(s);
    expect(reducer(s, { type: GridActionType.SetPage, page: 1 })).toBe(s);
    expect(reducer(s, { type: GridActionType.SetPageSize, pageSize: 20 })).toBe(s);
    expect(reducer(s, { type: GridActionType.SetQuickFilter, text: '' })).toBe(s);
  });

  it('clearFilters empties all filters and resets page', () => {
    let s = reducer(initial(), { type: GridActionType.SetFilter, columnId: 'a', entry });
    s = reducer(s, { type: GridActionType.SetPage, page: 4 });
    s = reducer(s, { type: GridActionType.ClearFilters });
    expect(s.filters).toEqual({});
    expect(s.page).toBe(1);
  });
});

describe('reducer — pagination', () => {
  it('setPageSize resets to page 1', () => {
    let s = reducer(initial(), { type: GridActionType.SetPage, page: 5 });
    s = reducer(s, { type: GridActionType.SetPageSize, pageSize: 50 });
    expect(s.pageSize).toBe(50);
    expect(s.page).toBe(1);
  });

  it('setPage keeps selection (cross-page bulk actions) but collapses expansion', () => {
    let s = reducer(initial(), { type: GridActionType.SetSelection, ids: ['r1'] });
    s = reducer(s, { type: GridActionType.SetExpanded, ids: ['r2'] });
    s = reducer(s, { type: GridActionType.SetPage, page: 2 });
    expect(s.selection).toEqual(['r1']);
    expect(s.expanded).toEqual([]);
  });
});

describe('reducer — quick filter', () => {
  it('resets page and selection on text change', () => {
    let s = reducer(initial(), { type: GridActionType.SetPage, page: 2 });
    s = reducer(s, { type: GridActionType.SetSelection, ids: ['r1'] });
    s = reducer(s, { type: GridActionType.SetQuickFilter, text: 'mouse' });
    expect(s.quickFilter).toBe('mouse');
    expect(s.page).toBe(1);
    expect(s.selection).toEqual([]);
  });
});

describe('reducer — column layout', () => {
  it('persable layout transitions: order, visibility, width', () => {
    let s = reducer(initial(), { type: GridActionType.SetColumnOrder, order: ['b', 'a', 'c'] });
    expect(s.columnOrder).toEqual(['b', 'a', 'c']);
    s = reducer(s, { type: GridActionType.SetHiddenColumns, hidden: ['a'] });
    expect(s.hiddenColumns).toEqual(['a']);
    s = reducer(s, { type: GridActionType.SetColumnWidth, columnId: 'b', width: 240 });
    expect(s.columnWidths).toEqual({ b: 240 });
    expect(reducer(s, { type: GridActionType.SetColumnWidth, columnId: 'b', width: 240 })).toBe(s);
  });
});

describe('reducer — expansion', () => {
  it('toggleExpanded adds and removes row ids', () => {
    let s = reducer(initial(), { type: GridActionType.ToggleExpanded, id: 'r1' });
    expect(s.expanded).toEqual(['r1']);
    s = reducer(s, { type: GridActionType.ToggleExpanded, id: 'r2' });
    expect(s.expanded).toEqual(['r1', 'r2']);
    s = reducer(s, { type: GridActionType.ToggleExpanded, id: 'r1' });
    expect(s.expanded).toEqual(['r2']);
  });
});
