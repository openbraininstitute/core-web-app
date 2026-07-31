import type { TContextualValue } from './grid-context';

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

/**
 * How a SET filter with no {@link TFilterOptionsSource} collects its values, i.e.
 * what the free-entry (paste-a-list) editor accepts and validates:
 * - `uuid` — canonical UUIDs only; malformed tokens are flagged and block Apply.
 * - `text` — arbitrary strings (exact names, document URLs, …); nothing to validate.
 */
export const FreeEntryKind = {
  Uuid: 'uuid',
  Text: 'text',
} as const;

export type TFreeEntryKind = (typeof FreeEntryKind)[keyof typeof FreeEntryKind];

/**
 * One backend field a column can be filtered BY ("match by name" vs "match by id").
 * A column declares its targets on {@link IColumnFilter.targets}; the filter editor
 * renders a segmented switch when more than one is visible, and the active target's
 * {@link field} is what the binding serializes.
 *
 * The legacy flat `{ field, operators, options, facetKey, description }` on
 * {@link IColumnFilter} IS an implicit single target — see `resolveFilterTargets`,
 * which synthesises it when {@link IColumnFilter.targets} is absent, so every
 * pre-existing schema keeps working untouched.
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
  /**
   * Placeholder for this target's value input, overriding the one derived from the
   * active operator (see `resolveFilterPlaceholder`). Declare it whenever the
   * generic wording would mislead — the editor is shared by every filter, so it
   * cannot know that a field wants an acronym, a URL or an annotation value.
   */
  placeholder?: string;
  /**
   * For a set target WITHOUT {@link options} (a free-entry, paste-a-list target):
   * what its tokens are. Defaults to {@link FreeEntryKind.Uuid} — the historical
   * behaviour, since every free-entry target so far has been an id target.
   */
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
  /**
   * key under which facet options are returned (when it differs from the
   * serialization {@link field} — e.g. options under `mtype` but filtered as
   * `mtype__pref_label__in`). Defaults to {@link field}.
   */
  facetKey?: string;
  /** short help text shown at the top of the filter popup */
  description?: string;
  /** contextual availability (default: true) */
  available?: TContextualValue<boolean>;
  /**
   * The fields this column can be filtered BY. Omit for the classic single-field
   * column: the flat props above are then synthesised into a single target (see
   * `resolveFilterTargets`), so existing schemas need no migration.
   */
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
  /** value accessor (sort fallback, quick filter, export) */
  getValue?: (row: Row) => TCellValue;
  /** cell renderer key resolved by the rendering adapter's cell-renderer registry */
  cellRenderer?: string;
  cellRendererParams?: Record<string, unknown>;
  /**
   * Whether the column exists at all in the current context (default: true). A
   * column that resolves to `false` is dropped entirely — not offered by the
   * column chooser. Contextual, so a column can appear only in certain
   * sections/scopes/species/etc.
   */
  available?: TContextualValue<boolean>;
  /**
   * Position weight ("where") — columns are ordered by ascending resolved value,
   * ties keeping declaration order. Contextual, so a column can move position by
   * context. Columns without an explicit order keep their declaration slot.
   */
  order?: TContextualValue<number>;
  /**
   * Start hidden — present in the grid and offered by the column chooser, but not
   * shown until the user enables it. Contextual (default: false).
   */
  hiddenByDefault?: TContextualValue<boolean>;
  filter?: IColumnFilter;
}
