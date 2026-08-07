import {
  activeFilterTarget,
  advancedFilterDefsByKey,
  FilterValueKind,
  isAdvancedFilterKey,
  OperatorId,
  resolveFilterTargets,
  SortDirection,
} from '@/features/data-grid/core';

import type {
  IFilterEntry,
  IGridQuery,
  IGridSchema,
  TFilterModel,
  TSortModel,
} from '@/features/data-grid/core';

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
 * Per-operator serialization strategies. The only place that knows entitycore's
 * `field__op` param convention; a new operator needs a strategy here.
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
  // A handful of backend relation filters spell this `field_in`, not `field__in`
  // (e.g. `post_region__name_in`).
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
  /**
   * Exact numeric match as a degenerate range.
   */
  [OperatorId.NumberEq]: (field, e) =>
    e.value.kind === FilterValueKind.Number && e.value.value != null
      ? { [`${field}__gte`]: e.value.value, [`${field}__lte`]: e.value.value }
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
  /** backend field for a filter entry, resolved from its ACTIVE target */
  filterField(columnId: string, targetId?: string): string;
  sortFields(columnId: string): string[];
}

export function buildColumnLookup<Row>(schema: IGridSchema<Row>): ColumnLookup {
  const byId = new Map(schema.columns.map((c) => [c.id, c] as const));
  // Advanced filters share the `filters` record, keyed by `adv:<group>:<filter>`, and
  // resolve to a field the same way — one strategy table serves both.
  const advanced = advancedFilterDefsByKey(schema);
  return {
    filterField(columnId, targetId) {
      if (isAdvancedFilterKey(columnId)) {
        // An orphaned key (schema changed after state was persisted) resolves to '' so
        // it is dropped, never emitted as a param literally named `adv:…`.
        return advanced.get(columnId)?.field ?? '';
      }
      const c = byId.get(columnId);
      if (!c) return columnId;
      const target = activeFilterTarget(resolveFilterTargets(c), targetId);
      return target?.field ?? c.field ?? columnId;
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
    const field = lookup.filterField(entry.columnId, entry.targetId);
    // Unresolvable entry (pruned advanced filter); `__in` on an empty name would
    // corrupt the request.
    if (!field) continue;
    Object.assign(out, strategy(field, entry));
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
