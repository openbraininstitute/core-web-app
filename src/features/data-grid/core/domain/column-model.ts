import type { TContextualValue } from '@/features/data-grid/core/domain/grid-context';

export const Align = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
} as const;

export type TAlign = (typeof Align)[keyof typeof Align];

export interface IWidthSpec {
  width?: number;
  minWidth?: number;
  flex?: number;
  resizable?: boolean;
}

export type TCellValue = string | number | boolean | null | undefined;

/** Discriminants for {@link TFilterOptionsSource}. */
export const FilterOptionsKind = {
  Facets: 'facets',
  Static: 'static',
  Async: 'async',
} as const;

export type TFilterOptionsKind = (typeof FilterOptionsKind)[keyof typeof FilterOptionsKind];

/** Where a set/facet filter sources its selectable options. */
export type TFilterOptionsSource =
  | { kind: typeof FilterOptionsKind.Facets }
  | {
      kind: typeof FilterOptionsKind.Static;
      items: ReadonlyArray<{ id: string; label: string }>;
    }
  | {
      kind: typeof FilterOptionsKind.Async;
      load: () => Promise<Array<{ id: string; label: string }>>;
    };

/** What a free-entry (paste-a-list) filter editor accepts. `uuid` is validated; `text` is not. */
export const FreeEntryKind = {
  Uuid: 'uuid',
  Text: 'text',
} as const;

export type TFreeEntryKind = (typeof FreeEntryKind)[keyof typeof FreeEntryKind];

/**
 * One backend field a column can be filtered BY ("match by name" vs "match by id").
 * The editor shows a switch when a column declares more than one; the active
 * target's {@link field} is what gets serialized.
 */
export interface IFilterTarget {
  /** stable id, persisted on the filter entry (`'name'`, `'id'`, `'acronym'`, …) */
  id: string;
  /** sentence-case label shown in the "match by" switch */
  label: string;
  /** backend field used for serializing the filter when this target is active */
  field: string;
  /** ordered operator ids valid FOR THIS TARGET; index 0 is the default */
  operators: string[];
  /** option source for set/facet operators; omit for free-entry (id/UUID) targets */
  options?: TFilterOptionsSource;
  /** key under which facet options are returned; defaults to {@link field} */
  facetKey?: string;
  /** short help text shown at the top of the filter popup for this target */
  description?: string;
  /** overrides the placeholder derived from the active operator */
  placeholder?: string;
  /** token kind for a free-entry target (no {@link options}); defaults to UUID */
  freeEntry?: TFreeEntryKind;
  /** contextual availability (default: true) */
  available?: TContextualValue<boolean>;
}

export interface IColumnFilter {
  /** ordered operator ids; index 0 is the default. Each must exist in the operator registry. */
  operators: string[];
  /** backend field used for serializing the filter; defaults to column.field ?? column.id */
  field?: string;
  /** option source for set/facet operators */
  options?: TFilterOptionsSource;
  /** key facet options are returned under, when it differs from {@link field} */
  facetKey?: string;
  /** short help text shown at the top of the filter popup */
  description?: string;
  /** contextual availability (default: true) */
  available?: TContextualValue<boolean>;
  /** fields this column can be filtered by; omit and the flat props above become one target */
  targets?: ReadonlyArray<IFilterTarget>;
}

/**
 * A renderer-agnostic column definition. Cell rendering is referenced by a string
 * `cellRenderer` key resolved by the rendering adapter's registry, so this type
 * (and the whole core ring) stays free of React / AG Grid.
 */
export interface IColumnModel<Row = unknown> {
  /** logical id — used in state, sort and filter models */
  id: string;
  /** backend field path; defaults to id. Used for serialization & sort. */
  field?: string;
  header: string;
  unit?: string;
  align?: TAlign;
  width?: IWidthSpec;
  sortable?: boolean;
  /** backend field(s) for order_by; defaults to field ?? id */
  sortField?: string | string[];
  /** value accessor (sort fallback, free-text search, export) */
  getValue?: (row: Row) => TCellValue;
  /** cell renderer key resolved by the rendering adapter's cell-renderer registry */
  cellRenderer?: string;
  cellRendererParams?: Record<string, unknown>;
  /** whether the column exists at all here (default: true); `false` drops it, chooser included */
  available?: TContextualValue<boolean>;
  /** position weight, ascending; ties keep declaration order */
  order?: TContextualValue<number>;
  /**
   * Start hidden but offered by the column chooser (default: false). Leave undefined
   * on an {@link auxiliary} column, which already implies it; setting it always wins.
   */
  hiddenByDefault?: TContextualValue<boolean>;
  /**
   * Hidden until the user ticks it in the column chooser, below the separator.
   *
   * Every backend-filterable field is represented exactly once — as a column or as an
   * entry in `schema.advancedFilters`, never both — so the advanced panel is derived:
   * `advancedFilters + auxiliary columns currently hidden`. Ticking one therefore moves
   * its filter from the panel into the column header; both key it by column id, so an
   * applied filter survives the move.
   *
   * Implies {@link hiddenByDefault}. Keep `sortable: false` unless the field is in the
   * endpoint's `ordering_model_fields` — entitycore 422s on anything else.
   */
  auxiliary?: boolean;
  /**
   * The user may never hide this column: its checkbox is disabled in the chooser, a bulk
   * deselect keeps it, and a persisted layout that hides it is repaired on load.
   */
  alwaysVisible?: boolean;
  /**
   * Kept visible by a BULK deselect, so "Select all" can never empty the grid. Not a
   * lock: the user can still hide it via its own checkbox. When a schema marks none,
   * {@link essentialColumnIds} falls back to the first non-auxiliary column.
   */
  essential?: boolean;
  /**
   * Whether the user may drag this column elsewhere (default: true). `false` pins it to
   * its declared slot: no drag handle, and any position a persisted `columnOrder`
   * records for it is ignored. For columns whose position carries meaning — e.g. the
   * one hosting a tree's expand chevron.
   */
  movable?: boolean;
  filter?: IColumnFilter;
}

/**
 * The columns a bulk deselect keeps visible: those marked `essential`, else the first
 * non-auxiliary one. In declaration order, and empty only for an empty column list.
 */
export function essentialColumnIds(
  columns: ReadonlyArray<{ id: string; auxiliary?: boolean; essential?: boolean }>
): Array<string> {
  const marked = columns.filter((c) => c.essential);
  if (marked.length > 0) return marked.map((c) => c.id);
  const fallback = columns.find((c) => !c.auxiliary) ?? columns[0];
  return fallback ? [fallback.id] : [];
}
