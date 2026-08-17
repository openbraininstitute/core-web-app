import type { IFilterEntry, TFilterModel } from '@/features/data-grid/core/domain/filter-model';
import type { TSortModel } from '@/features/data-grid/core/domain/sort-model';

export interface IGridState {
  filters: TFilterModel;
  sort: TSortModel;
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
  freeTextSearch: string;
}

/** Discriminants for {@link TGridAction}. */
export const GridActionType = {
  SetFilter: 'setFilter',
  ClearFilters: 'clearFilters',
  SetSort: 'setSort',
  ToggleSort: 'toggleSort',
  SetPage: 'setPage',
  SetPageSize: 'setPageSize',
  SetColumnOrder: 'setColumnOrder',
  SetHiddenColumns: 'setHiddenColumns',
  SetColumnWidth: 'setColumnWidth',
  SetSelection: 'setSelection',
  SetExpanded: 'setExpanded',
  ToggleExpanded: 'toggleExpanded',
  SetFreeTextSearch: 'setFreeTextSearch',
  Hydrate: 'hydrate',
  Reset: 'reset',
} as const;

export type TGridActionType = (typeof GridActionType)[keyof typeof GridActionType];

export type TGridAction =
  | { type: typeof GridActionType.SetFilter; columnId: string; entry: IFilterEntry | null }
  | { type: typeof GridActionType.ClearFilters }
  | { type: typeof GridActionType.SetSort; sort: TSortModel }
  | { type: typeof GridActionType.ToggleSort; columnId: string; allowMulti?: boolean }
  | { type: typeof GridActionType.SetPage; page: number }
  | { type: typeof GridActionType.SetPageSize; pageSize: number }
  | { type: typeof GridActionType.SetColumnOrder; order: string[] }
  | { type: typeof GridActionType.SetHiddenColumns; hidden: string[] }
  | { type: typeof GridActionType.SetColumnWidth; columnId: string; width: number }
  | { type: typeof GridActionType.SetSelection; ids: string[] }
  | { type: typeof GridActionType.SetExpanded; ids: string[] }
  | { type: typeof GridActionType.ToggleExpanded; id: string }
  | { type: typeof GridActionType.SetFreeTextSearch; text: string }
  | { type: typeof GridActionType.Hydrate; state: Partial<IGridState> }
  | { type: typeof GridActionType.Reset; state: IGridState };
