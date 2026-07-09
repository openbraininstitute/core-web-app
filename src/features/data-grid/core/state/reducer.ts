import type { SortDirection, SortModel } from '../domain/sort-model';
import type { GridAction, GridState } from './grid-state';

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Cyclic single-column sort: none → desc → asc → none (matches the legacy table). */
function toggleSort(sort: SortModel, columnId: string, allowMulti: boolean): SortModel {
  const existing = sort.find((s) => s.columnId === columnId);
  const rest = sort.filter((s) => s.columnId !== columnId);

  let next: SortDirection | null = 'desc';
  if (existing?.direction === 'desc') next = 'asc';
  else if (existing?.direction === 'asc') next = null;

  const base = allowMulti ? rest : [];
  return next === null ? base : [{ columnId, direction: next }, ...base];
}

/**
 * Pure state transitions. Returns the SAME reference when nothing changes so that
 * `useSyncExternalStore` consumers don't re-render needlessly. Filter / sort /
 * page-size / quick-filter changes reset the page to 1; data-changing transitions
 * also clear the row selection (the selected rows may no longer be in view).
 */
export function reducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'setFilter': {
      const next = { ...state.filters };
      if (action.entry === null) {
        if (!(action.columnId in next)) return state;
        delete next[action.columnId];
      } else {
        next[action.columnId] = action.entry;
      }
      return { ...state, filters: next, page: 1, selection: [], expanded: [] };
    }
    case 'clearFilters':
      return Object.keys(state.filters).length === 0
        ? state
        : { ...state, filters: {}, page: 1, selection: [], expanded: [] };
    case 'setSort':
      return { ...state, sort: action.sort, page: 1, expanded: [] };
    case 'toggleSort':
      return {
        ...state,
        sort: toggleSort(state.sort, action.columnId, action.allowMulti ?? false),
        page: 1,
        expanded: [],
      };
    case 'setPage':
      return state.page === action.page ? state : { ...state, page: action.page, expanded: [] };
    case 'setPageSize':
      return state.pageSize === action.pageSize
        ? state
        : { ...state, pageSize: action.pageSize, page: 1, expanded: [] };
    case 'setColumnOrder':
      return sameIds(state.columnOrder, action.order)
        ? state
        : { ...state, columnOrder: action.order };
    case 'setHiddenColumns':
      return sameIds(state.hiddenColumns, action.hidden)
        ? state
        : { ...state, hiddenColumns: action.hidden };
    case 'setColumnWidth':
      return state.columnWidths[action.columnId] === action.width
        ? state
        : {
            ...state,
            columnWidths: { ...state.columnWidths, [action.columnId]: action.width },
          };
    case 'setSelection':
      return sameIds(state.selection, action.ids) ? state : { ...state, selection: action.ids };
    case 'setExpanded':
      return sameIds(state.expanded, action.ids) ? state : { ...state, expanded: action.ids };
    case 'toggleExpanded':
      return {
        ...state,
        expanded: state.expanded.includes(action.id)
          ? state.expanded.filter((id) => id !== action.id)
          : [...state.expanded, action.id],
      };
    case 'setQuickFilter':
      return state.quickFilter === action.text
        ? state
        : { ...state, quickFilter: action.text, page: 1, selection: [], expanded: [] };
    case 'hydrate':
      return { ...state, ...action.state };
    case 'reset':
      return action.state;
    default:
      return state;
  }
}
