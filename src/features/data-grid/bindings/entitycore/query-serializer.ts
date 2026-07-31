import { FilterValueKind, OperatorId, SortDirection } from '../../core';

import type { IFilterEntry, IGridQuery, IGridSchema, TFilterModel, TSortModel } from '../../core';

export type TEntitycoreParams = Record<string, unknown>;

export interface ISerializeOptions {
  /** how the quick-filter maps to the API (entitycore `ilike_search` vs `search`) */
  searchMode?: 'ilike' | 'plain';
}

/** "contains" ilike: escape `%`/`_`, then wrap the term in `%…%`. */
export function toContainsPattern(input: string): string {
  return `%${input.replace(/[%_]/g, (m) => `\\${m}`)}%`;
}

/**
 * Per-operator serialization strategies (Strategy pattern). This is the single
 * entitycore-specific place that knows the `field__op` convention, replacing the
 * legacy `transformFiltersToQuery`. Adding an operator = add a strategy here +
 * declare it on a column.
 */
type Strategy = (field: string, entry: IFilterEntry) => TEntitycoreParams;

const STRATEGIES: Record<string, Strategy> = {
  [OperatorId.Ilike]: (field, e) =>
    e.value.kind === FilterValueKind.Text && e.value.text.trim()
      ? { [`${field}__ilike`]: toContainsPattern(e.value.text.trim()) }
      : {},
  [OperatorId.Contains]: (field, e) =>
    e.value.kind === FilterValueKind.Text && e.value.text.trim()
      ? { [`${field}__contains`]: e.value.text.trim() }
      : {},
  [OperatorId.Eq]: (field, e) =>
    e.value.kind === FilterValueKind.Text && e.value.text.trim()
      ? { [field]: e.value.text.trim() }
      : {},
  [OperatorId.In]: (field, e) =>
    e.value.kind === FilterValueKind.Set && e.value.values.length
      ? { [`${field}__in`]: e.value.values }
      : {},
  // Single-underscore `_in` — see OperatorId.InSingleUnderscore (backend spells a
  // handful of relation filters this way, e.g. `post_region__name_in`).
  [OperatorId.InSingleUnderscore]: (field, e) =>
    e.value.kind === FilterValueKind.Set && e.value.values.length
      ? { [`${field}_in`]: e.value.values }
      : {},
  [OperatorId.NotIn]: (field, e) =>
    e.value.kind === FilterValueKind.Set && e.value.values.length
      ? { [`${field}__not_in`]: e.value.values }
      : {},
  [OperatorId.Gte]: (field, e) =>
    e.value.kind === FilterValueKind.Number && e.value.value != null
      ? { [`${field}__gte`]: e.value.value }
      : {},
  [OperatorId.Lte]: (field, e) =>
    e.value.kind === FilterValueKind.Number && e.value.value != null
      ? { [`${field}__lte`]: e.value.value }
      : {},
  [OperatorId.Range]: (field, e) => {
    if (e.value.kind !== FilterValueKind.Range) return {};
    const out: TEntitycoreParams = {};
    if (e.value.min != null) out[`${field}__gte`] = e.value.min;
    if (e.value.max != null) out[`${field}__lte`] = e.value.max;
    return out;
  },
  [OperatorId.DateRange]: (field, e) => {
    if (e.value.kind !== FilterValueKind.DateRange) return {};
    const out: TEntitycoreParams = {};
    if (e.value.from) out[`${field}__gte`] = e.value.from;
    if (e.value.to) out[`${field}__lte`] = e.value.to;
    return out;
  },
  [OperatorId.Bool]: (field, e) =>
    e.value.kind === FilterValueKind.Boolean && e.value.value != null
      ? { [field]: e.value.value }
      : {},
};

interface ColumnLookup {
  filterField(columnId: string): string;
  sortFields(columnId: string): string[];
}

export function buildColumnLookup<Row>(schema: IGridSchema<Row>): ColumnLookup {
  const byId = new Map(schema.columns.map((c) => [c.id, c] as const));
  return {
    filterField(columnId) {
      const c = byId.get(columnId);
      return c?.filter?.field ?? c?.field ?? columnId;
    },
    sortFields(columnId) {
      const c = byId.get(columnId);
      const sf = c?.sortField ?? c?.field ?? columnId;
      return Array.isArray(sf) ? sf : [sf];
    },
  };
}

function serializeFilters(filters: TFilterModel, lookup: ColumnLookup): TEntitycoreParams {
  const out: TEntitycoreParams = {};
  for (const entry of Object.values(filters)) {
    const strategy = STRATEGIES[entry.operator];
    if (!strategy) continue;
    Object.assign(out, strategy(lookup.filterField(entry.columnId), entry));
  }
  return out;
}

function serializeSort(sort: TSortModel, lookup: ColumnLookup): string[] {
  return sort.flatMap((s) =>
    lookup.sortFields(s.columnId).map((f) => `${s.direction === SortDirection.Asc ? '+' : '-'}${f}`)
  );
}

/** Turn the abstract {@link IGridQuery} into entitycore query params. */
export function serializeQuery<Row>(
  query: IGridQuery,
  schema: IGridSchema<Row>,
  options: ISerializeOptions = {}
): TEntitycoreParams {
  const lookup = buildColumnLookup(schema);
  const orderBy = serializeSort(query.sort, lookup);

  const params: TEntitycoreParams = {
    page: query.page,
    page_size: query.pageSize,
    ...serializeFilters(query.filters, lookup),
    ...(query.params ?? {}),
  };

  if (orderBy.length > 0) params.order_by = orderBy;

  const quick = query.quickFilter?.trim();
  if (quick) {
    if ((options.searchMode ?? 'plain') === 'ilike') params.ilike_search = `*${quick}*`;
    else params.search = quick;
  }

  return params;
}
