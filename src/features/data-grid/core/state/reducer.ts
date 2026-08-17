import { SortDirection } from '@/features/data-grid/core/domain/sort-model';
import { GridActionType } from '@/features/data-grid/core/state/grid-state';

import type { TSortDirection, TSortModel } from '@/features/data-grid/core/domain/sort-model';
import type { IGridState, TGridAction } from '@/features/data-grid/core/state/grid-state';

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Cyclic single-column sort: none → desc → asc → none. */
function toggleSort(sort: TSortModel, columnId: string, allowMulti: boolean): TSortModel {
  const existing = sort.find((s) => s.columnId === columnId);
  const rest = sort.filter((s) => s.columnId !== columnId);

  let next: TSortDirection | null = SortDirection.Desc;
  if (existing?.direction === SortDirection.Desc) next = SortDirection.Asc;
  else if (existing?.direction === SortDirection.Asc) next = null;

  const base = allowMulti ? rest : [];
  return next === null ? base : [{ columnId, direction: next }, ...base];
}

/**
 * Pure state transitions. Returns the same reference when nothing changes, so
 * `useSyncExternalStore` consumers don't re-render. Filter/sort/page-size/quick-filter
 * changes reset the page to 1; data-changing transitions also clear the selection.
 */
export function reducer(state: IGridState, action: TGridAction): IGridState {
  switch (action.type) {
    case GridActionType.SetFilter: {
      const next = { ...state.filters };
      if (action.entry === null) {
        if (!(action.columnId in next)) return state;
        delete next[action.columnId];
      } else {
        next[action.columnId] = action.entry;
      }
      return { ...state, filters: next, page: 1, selection: [], expanded: [] };
    }
    case GridActionType.ClearFilters:
      return Object.keys(state.filters).length === 0
        ? state
        : { ...state, filters: {}, page: 1, selection: [], expanded: [] };
    case GridActionType.SetSort:
      return { ...state, sort: action.sort, page: 1, expanded: [] };
    case GridActionType.ToggleSort:
      return {
        ...state,
        sort: toggleSort(state.sort, action.columnId, action.allowMulti ?? false),
        page: 1,
        expanded: [],
      };
    case GridActionType.SetPage:
      return state.page === action.page ? state : { ...state, page: action.page, expanded: [] };
    case GridActionType.SetPageSize:
      return state.pageSize === action.pageSize
        ? state
        : { ...state, pageSize: action.pageSize, page: 1, expanded: [] };
    case GridActionType.SetColumnOrder:
      return sameIds(state.columnOrder, action.order)
        ? state
        : { ...state, columnOrder: action.order };
    case GridActionType.SetHiddenColumns:
      return sameIds(state.hiddenColumns, action.hidden)
        ? state
        : { ...state, hiddenColumns: action.hidden };
    case GridActionType.SetColumnWidth:
      return state.columnWidths[action.columnId] === action.width
        ? state
        : {
            ...state,
            columnWidths: { ...state.columnWidths, [action.columnId]: action.width },
          };
    case GridActionType.SetSelection:
      return sameIds(state.selection, action.ids) ? state : { ...state, selection: action.ids };
    case GridActionType.SetExpanded:
      return sameIds(state.expanded, action.ids) ? state : { ...state, expanded: action.ids };
    case GridActionType.ToggleExpanded:
      return {
        ...state,
        expanded: state.expanded.includes(action.id)
          ? state.expanded.filter((id) => id !== action.id)
          : [...state.expanded, action.id],
      };
    case GridActionType.SetQuickFilter:
      return state.quickFilter === action.text
        ? state
        : { ...state, quickFilter: action.text, page: 1, selection: [], expanded: [] };
    case GridActionType.Hydrate:
      return { ...state, ...action.state };
    case GridActionType.Reset:
      return action.state;
    default:
      return state;
  }
}
