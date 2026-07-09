import type { FilterEntry, FilterModel } from '../domain/filter-model';
import type { SortModel } from '../domain/sort-model';

export interface GridState {
  filters: FilterModel;
  sort: SortModel;
  /** 1-indexed page number */
  page: number;
  pageSize: number;
  /** column ids in display order */
  columnOrder: string[];
  /** hidden column ids */
  hiddenColumns: string[];
  /** user-resized column widths (px), keyed by column id */
  columnWidths: Record<string, number>;
  /** selected row ids */
  selection: string[];
  /** expanded (top-level) row ids */
  expanded: string[];
  quickFilter: string;
}

export type GridAction =
  | { type: 'setFilter'; columnId: string; entry: FilterEntry | null }
  | { type: 'clearFilters' }
  | { type: 'setSort'; sort: SortModel }
  | { type: 'toggleSort'; columnId: string; allowMulti?: boolean }
  | { type: 'setPage'; page: number }
  | { type: 'setPageSize'; pageSize: number }
  | { type: 'setColumnOrder'; order: string[] }
  | { type: 'setHiddenColumns'; hidden: string[] }
  | { type: 'setColumnWidth'; columnId: string; width: number }
  | { type: 'setSelection'; ids: string[] }
  | { type: 'setExpanded'; ids: string[] }
  | { type: 'toggleExpanded'; id: string }
  | { type: 'setQuickFilter'; text: string }
  | { type: 'hydrate'; state: Partial<GridState> }
  | { type: 'reset'; state: GridState };
