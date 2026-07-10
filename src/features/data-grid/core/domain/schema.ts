import type { ColumnModel } from './column-model';
import type { ContextualValue } from './grid-context';
import type { SortModel } from './sort-model';

/**
 * Expandable full-width detail rows. The `rendererKey` selects a React renderer
 * from the detail-renderer registry; the optional {@link DetailProvider} port
 * (passed to the grid alongside the schema) supplies async payload loading.
 */
export interface DetailSpec<Row = unknown> {
  /** detail renderer key resolved by the rendering adapter's detail registry */
  rendererKey: string;
  /** whether a given row can expand (default: all rows) */
  isExpandable?: (row: Row) => boolean;
  /** initial/minimum height of the detail row in px while content measures itself */
  minHeight?: number;
}

/** Multi-row checkbox selection feeding the toolbar's bulk actions. */
export interface SelectionSpec {
  /** contextual enablement (default: false — selection is opt-in) */
  enabled: ContextualValue<boolean>;
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
export interface GridSchema<Row = unknown> {
  /** stable id, typically the dataType */
  id: string;
  columns: Array<ColumnModel<Row>>;
  /** default sort applied when state carries none */
  defaultSort?: SortModel;
  /** row height in px (e.g. taller rows for preview thumbnails); default 44 */
  rowHeight?: number;
  /** page-size choices offered by the pagination size changer */
  pageSizeOptions?: number[];
  /** unique, stable row id accessor */
  getRowId: (row: Row) => string;
  /** optional expandable detail capability */
  detail?: DetailSpec<Row>;
  /** optional checkbox selection capability */
  selection?: SelectionSpec;
}
