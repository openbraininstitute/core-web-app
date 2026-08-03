/**
 * Renderer-agnostic filter values. Each variant aligns with an operator UI kind
 * (see {@link OperatorUiKind}). A binding's serializer turns (operator, value)
 * into transport-specific request params.
 */
export const FilterValueKind = {
  Text: 'text',
  Number: 'number',
  Range: 'range',
  DateRange: 'dateRange',
  Set: 'set',
  Boolean: 'boolean',
} as const;

export type TFilterValueKind = (typeof FilterValueKind)[keyof typeof FilterValueKind];

export type TFilterValue =
  | { kind: typeof FilterValueKind.Text; text: string }
  | { kind: typeof FilterValueKind.Number; value: number | null }
  | { kind: typeof FilterValueKind.Range; min: number | null; max: number | null }
  | { kind: typeof FilterValueKind.DateRange; from: string | null; to: string | null }
  | { kind: typeof FilterValueKind.Set; values: string[] }
  | { kind: typeof FilterValueKind.Boolean; value: boolean | null };

export interface IFilterEntry {
  /** logical column id */
  columnId: string;
  /** chosen operator id (must be one of the column's declared operators) */
  operator: string;
  /**
   * id of the {@link IFilterTarget} this entry filters by (which backend field).
   * Absent on entries written before targets existed (and on single-target columns
   * set programmatically) — consumers fall back to the column's first target.
   */
  targetId?: string;
  value: TFilterValue;
}

/** Active filters keyed by column id. */
export type TFilterModel = Record<string, IFilterEntry>;

function formatIsoDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '';
}

/**
 * Turns ONE stored filter value (the wire id — `'modified_reconstruction'`, a facet
 * label, a UUID) into the human label the user picked it by. Returns `undefined`
 * when this value is not one of the target's known options, so the caller can fall
 * back to the raw value rather than inventing one.
 *
 * Built by `filterOptionLabeler` (`domain/filter-labels.ts`), which is where the
 * option sources — static items, facet buckets — are read.
 */
export type TFilterValueLabeler = (rawValue: string) => string | undefined;

/** How many set values are spelled out before the summary switches to "+N more". */
const MAX_LISTED_SET_VALUES = 3;

/**
 * Short, human-readable summary of an active filter's value (e.g.
 * `"Modified reconstruction"`, `"2024-01-01 – *"`). Renderer-agnostic — used by the
 * header's active-state test, the advanced-filter list and the applied-filters pane.
 * Returns `''` for an empty/no-op value.
 *
 * `labelOf` resolves stored values back to the LABEL the user picked. Pass it
 * whenever the filter's target is known: without it a set summarizes as
 * `"3 selected"` (the right answer for a free-entry list of UUIDs, which no label
 * could improve), with it as the joined option labels.
 */
export function summarizeFilter(entry: IFilterEntry, labelOf?: TFilterValueLabeler): string {
  const v = entry.value;
  switch (v.kind) {
    case 'text': {
      // A text operator on a target with a static option list is an exact-match enum
      // (`…__protocol_design`): the stored text IS the option id, never free text.
      const text = v.text.trim();
      return text === '' ? '' : (labelOf?.(text) ?? text);
    }
    case 'number':
      return v.value == null ? '' : String(v.value);
    case 'range':
      return v.min == null && v.max == null ? '' : `${v.min ?? '*'} – ${v.max ?? '*'}`;
    case 'dateRange': {
      const from = formatIsoDate(v.from);
      const to = formatIsoDate(v.to);
      return from || to ? `${from || '*'} – ${to || '*'}` : '';
    }
    case 'set': {
      if (v.values.length === 0) return '';
      if (!labelOf) return `${v.values.length} selected`;
      const labels = v.values.map((raw) => labelOf(raw) ?? raw);
      if (labels.length <= MAX_LISTED_SET_VALUES) return labels.join(', ');
      const shown = labels.slice(0, MAX_LISTED_SET_VALUES).join(', ');
      return `${shown} +${labels.length - MAX_LISTED_SET_VALUES} more`;
    }
    case 'boolean':
      return v.value == null ? '' : v.value ? 'Yes' : 'No';
    default:
      return '';
  }
}

/** True when a filter value would serialize to nothing (used to drop no-op entries). */
export function isEmptyFilterValue(value: TFilterValue): boolean {
  switch (value.kind) {
    case 'text':
      return value.text.trim() === '';
    case 'number':
      return value.value == null;
    case 'range':
      return value.min == null && value.max == null;
    case 'dateRange':
      return !value.from && !value.to;
    case 'set':
      return value.values.length === 0;
    case 'boolean':
      return value.value == null;
    default:
      return true;
  }
}
