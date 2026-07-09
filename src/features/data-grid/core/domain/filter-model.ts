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
