import type { IAdvancedFilterGroup } from './advanced-filters';
import type { IColumnModel } from './column-model';
import type { TContextualValue } from './grid-context';
import type { TSortModel } from './sort-model';

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
   * Backend filters this entity accepts that have NO column in the grid — grouped
   * for the toolbar's filter menubar. Each entry is an ordinary
   * {@link IFilterTarget}, so advanced and column filters share one model, one
   * operator registry, one set of value editors and one serializer.
   */
  advancedFilters?: ReadonlyArray<IAdvancedFilterGroup>;
  /** default sort applied when state carries none */
  defaultSort?: TSortModel;
  /**
   * Whether the grid SORTS AT ALL in the current context (default: true).
   *
   * The per-column {@link IColumnModel.sortable} says which columns *can* sort; this
   * says whether sorting is meaningful for this listing right now. Contextual, so a
   * view whose row order is structural rather than field-derived — the circuit
   * hierarchy view, where rows are a derivation tree and the data source ignores
   * `order_by` — can turn every header's sort affordance off with ONE declaration
   * instead of annotating each column. Resolved in `resolveColumns`, which forces
   * `sortable: false` on every column when this resolves false, so no surface
   * (header arrows, click handler, query serialization) sees a sortable column.
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
