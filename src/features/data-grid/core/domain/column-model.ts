import type { ContextualValue } from './grid-context';

export type Align = 'left' | 'center' | 'right';

export interface WidthSpec {
  width?: number;
  minWidth?: number;
  flex?: number;
  resizable?: boolean;
}

export type CellValue = string | number | boolean | null | undefined;

/** Where a set/facet filter sources its selectable options. */
export type FilterOptionsSource =
  | { kind: 'facets' }
  | { kind: 'static'; items: ReadonlyArray<{ id: string; label: string }> }
  | { kind: 'async'; load: () => Promise<Array<{ id: string; label: string }>> };

export interface ColumnFilter {
  /** ordered operator ids; index 0 is the default. Each must exist in the operator registry. */
  operators: string[];
  /** backend field used for serializing the filter; defaults to column.field ?? column.id */
  field?: string;
  /** option source for set/facet operators */
  options?: FilterOptionsSource;
  /**
   * key under which facet options are returned (when it differs from the
   * serialization {@link field} — e.g. options under `mtype` but filtered as
   * `mtype__pref_label__in`). Defaults to {@link field}.
   */
  facetKey?: string;
  /** short help text shown at the top of the filter popup */
  description?: string;
  /** contextual availability (default: true) */
  available?: ContextualValue<boolean>;
}

/**
 * A renderer-agnostic column definition. Cell rendering is referenced by a string
 * `cellRenderer` key resolved by the rendering adapter's registry, so this type
 * (and the whole core ring) stays free of React / AG Grid.
 */
export interface ColumnModel<Row = unknown> {
  /** logical id — used in state, sort and filter models */
  id: string;
  /** backend field path; defaults to id. Used for serialization & sort. */
  field?: string;
  header: string;
  unit?: string;
  align?: Align;
  width?: WidthSpec;
  sortable?: boolean;
  /** backend field(s) for order_by; defaults to field ?? id */
  sortField?: string | string[];
  /** value accessor (sort fallback, quick filter, export) */
  getValue?: (row: Row) => CellValue;
  /** cell renderer key resolved by the rendering adapter's cell-renderer registry */
  cellRenderer?: string;
  cellRendererParams?: Record<string, unknown>;
  /**
   * Whether the column exists at all in the current context (default: true). A
   * column that resolves to `false` is dropped entirely — not offered by the
   * column chooser. Contextual, so a column can appear only in certain
   * sections/scopes/species/etc.
   */
  available?: ContextualValue<boolean>;
  /**
   * Position weight ("where") — columns are ordered by ascending resolved value,
   * ties keeping declaration order. Contextual, so a column can move position by
   * context. Columns without an explicit order keep their declaration slot.
   */
  order?: ContextualValue<number>;
  /**
   * Start hidden — present in the grid and offered by the column chooser, but not
   * shown until the user enables it. Contextual (default: false).
   */
  hiddenByDefault?: ContextualValue<boolean>;
  filter?: ColumnFilter;
}
