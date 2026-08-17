import type { IAdvancedFilterGroup } from '@/features/data-grid/core/domain/advanced-filters';
import type { IColumnModel } from '@/features/data-grid/core/domain/column-model';
import type { TContextualValue } from '@/features/data-grid/core/domain/grid-context';
import type { TSortModel } from '@/features/data-grid/core/domain/sort-model';

/**
 * Expandable full-width detail rows. The `rendererKey` selects a React renderer
 * from the detail-renderer registry; the optional {@link IDetailProvider} port
 * (passed to the grid alongside the schema) supplies async payload loading.
 */
export interface IDetailSpec<Row = unknown> {
  /** detail renderer key resolved by the rendering adapter's detail registry */
  rendererKey: string;
  /** whether a given row can expand (default: all rows) */
  isExpandable?: (row: Row) => boolean;
  /** initial/minimum height of the detail row in px while content measures itself */
  minHeight?: number;
}

/** Multi-row checkbox selection feeding the toolbar's bulk actions. */
export interface ISelectionSpec {
  /** contextual enablement (default: false — selection is opt-in) */
  enabled: TContextualValue<boolean>;
  /** single vs multi-row checkboxes (default: 'multiRow') */
  mode?: 'single' | 'multiRow';
  /** show the header "select all (current page)" checkbox (default: true, multiRow only) */
  headerCheckbox?: boolean;
  /** checkbox column width in px (default: 48) */
  columnWidth?: number;
}

/**
 * The complete, declarative description of a grid for one entity/dataType.
 * Authored per entity in a binding; consumed by the headless controller and the
 * rendering adapter.
 */
export interface IGridSchema<Row = unknown> {
  /** stable id, typically the dataType */
  id: string;
  columns: Array<IColumnModel<Row>>;
  /**
   * Backend filters with no column in the grid, grouped for the toolbar's filter
   * menubar. Each entry is an ordinary {@link IFilterTarget}.
   */
  advancedFilters?: ReadonlyArray<IAdvancedFilterGroup>;
  /** default sort applied when state carries none */
  defaultSort?: TSortModel;
  /**
   * Whether the grid sorts at all in the current context (default: true), for views
   * whose row order is structural rather than field-derived. `resolveColumns` forces
   * `sortable: false` on every column when this resolves false.
   */
  sortable?: TContextualValue<boolean>;
  /** row height in px (e.g. taller rows for preview thumbnails); default 44 */
  rowHeight?: number;
  /** page-size choices offered by the pagination size changer */
  pageSizeOptions?: number[];
  /** unique, stable row id accessor */
  getRowId: (row: Row) => string;
  /** optional expandable detail capability */
  detail?: IDetailSpec<Row>;
  /** optional checkbox selection capability */
  selection?: ISelectionSpec;
}
