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
 * Short, human-readable summary of an active filter's value (e.g. `"2 selected"`,
 * `"2024-01-01 – *"`). Renderer-agnostic — used by the header floating summary and
 * the active-filters popover. Returns `''` for an empty/no-op value.
 */
export function summarizeFilter(entry: IFilterEntry): string {
  const v = entry.value;
  switch (v.kind) {
    case 'text':
      return v.text.trim();
    case 'number':
      return v.value == null ? '' : String(v.value);
    case 'range':
      return v.min == null && v.max == null ? '' : `${v.min ?? '*'} – ${v.max ?? '*'}`;
    case 'dateRange': {
      const from = formatIsoDate(v.from);
      const to = formatIsoDate(v.to);
      return from || to ? `${from || '*'} – ${to || '*'}` : '';
    }
    case 'set':
      return v.values.length ? `${v.values.length} selected` : '';
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
