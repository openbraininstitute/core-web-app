import {
  advancedFilterDefsByKey,
  isAdvancedFilterKey,
} from '@/features/data-grid/core/domain/advanced-filters';
import { FilterOptionsKind } from '@/features/data-grid/core/domain/column-model';
import { summarizeFilter } from '@/features/data-grid/core/domain/filter-model';
import {
  activeFilterTarget,
  isFreeEntryTarget,
  resolveFilterTargets,
} from '@/features/data-grid/core/domain/filter-targets';

import type { IFilterTarget } from '@/features/data-grid/core/domain/column-model';
import type {
  IFilterEntry,
  TFilterValueLabeler,
} from '@/features/data-grid/core/domain/filter-model';
import type { TFacets } from '@/features/data-grid/core/domain/query';
import type { IGridSchema } from '@/features/data-grid/core/domain/schema';

/**
 * Wire value → display label for one target, or `undefined` when the target has no
 * synchronously resolvable options (free-entry ids, async option lists — their
 * summary keeps the raw value).
 *
 * Facet targets resolve through the buckets the grid holds, by bucket label (what a
 * facet filter stores) AND by bucket id, so either persisted convention reads back.
 */
export function filterOptionLabeler(
  target: IFilterTarget | undefined,
  facets?: TFacets
): TFilterValueLabeler | undefined {
  if (!target) return undefined;
  const source = target.options;

  if (source?.kind === FilterOptionsKind.Static) {
    const byId = new Map(source.items.map((i) => [i.id, i.label] as const));
    return (raw) => byId.get(raw);
  }

  // An async list is loaded by the editor; a summary must never suspend or fetch.
  if (source?.kind === FilterOptionsKind.Async) return undefined;

  // No source means the grid's facets for a picker, but free-entry has no labels.
  if (!source && isFreeEntryTarget(target)) return undefined;

  const buckets = facets?.[target.facetKey ?? target.field];
  if (!buckets?.length) return undefined;
  const byValue = new Map<string, string>();
  for (const b of buckets) {
    byValue.set(b.label, b.label);
    byValue.set(b.id, b.label);
  }
  return (raw) => byValue.get(raw);
}

/**
 * The target an entry filters by, found from its state key: an advanced filter's
 * def for an `adv:…` key, else the named (or default) target of that column.
 * Deliberately context-free: an applied entry must summarize even when its target is
 * contextually unavailable in the current view.
 */
export function filterTargetForEntry<Row>(
  schema: IGridSchema<Row>,
  entry: IFilterEntry
): IFilterTarget | undefined {
  const key = entry.columnId;
  if (isAdvancedFilterKey(key)) return advancedFilterDefsByKey(schema).get(key);
  const column = schema.columns.find((c) => c.id === key);
  if (!column) return undefined;
  return activeFilterTarget(resolveFilterTargets(column), entry.targetId);
}

/**
 * {@link summarizeFilter} with labels resolved — the form UI surfaces holding the
 * schema (and ideally the current facets) should use, for column and advanced filters
 * alike.
 */
export function summarizeFilterEntry<Row>(
  entry: IFilterEntry,
  schema: IGridSchema<Row>,
  facets?: TFacets
): string {
  return summarizeFilter(entry, filterOptionLabeler(filterTargetForEntry(schema, entry), facets));
}
