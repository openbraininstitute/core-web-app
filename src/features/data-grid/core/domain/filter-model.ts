/**
 * Renderer-agnostic filter values. Each variant aligns with an operator UI kind
 * (see {@link OperatorUiKind}). A binding's serializer turns (operator, value)
 * into transport-specific request params.
 */
export type FilterValue =
  | { kind: 'text'; text: string }
  | { kind: 'number'; value: number | null }
  | { kind: 'range'; min: number | null; max: number | null }
  | { kind: 'dateRange'; from: string | null; to: string | null }
  | { kind: 'set'; values: string[] }
  | { kind: 'boolean'; value: boolean | null };

export type FilterValueKind = FilterValue['kind'];

export interface FilterEntry {
  /** logical column id */
  columnId: string;
  /** chosen operator id (must be one of the column's declared operators) */
  operator: string;
  value: FilterValue;
}

/** Active filters keyed by column id. */
export type FilterModel = Record<string, FilterEntry>;

function formatIsoDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '';
}

/**
 * Short, human-readable summary of an active filter's value (e.g. `"2 selected"`,
 * `"2024-01-01 – *"`). Renderer-agnostic — used by the header floating summary and
 * the active-filters popover. Returns `''` for an empty/no-op value.
 */
export function summarizeFilter(entry: FilterEntry): string {
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
export function isEmptyFilterValue(value: FilterValue): boolean {
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
