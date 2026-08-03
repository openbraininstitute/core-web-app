import { advancedFilterDefsByKey, isAdvancedFilterKey } from './advanced-filters';
import { FilterOptionsKind } from './column-model';
import { summarizeFilter } from './filter-model';
import { activeFilterTarget, isFreeEntryTarget, resolveFilterTargets } from './filter-targets';

import type { IFilterTarget } from './column-model';
import type { IFilterEntry, TFilterValueLabeler } from './filter-model';
import type { TFacets } from './query';
import type { IGridSchema } from './schema';

/**
 * VALUE → LABEL for filter summaries.
 *
 * What a filter STORES is the wire value: a static option's `id`
 * (`'modified_reconstruction'`), a facet bucket's label, a pasted UUID. What a
 * summary must SHOW is the label the user picked it by ("Modified reconstruction").
 * Only the filter's {@link IFilterTarget} knows the mapping, and for facet-sourced
 * targets only the current response's buckets do — which is why `summarizeFilter`
 * takes a resolver instead of trying to look labels up itself.
 */

/**
 * A labeler for one target, or `undefined` when this target has no resolvable
 * options — free-entry ids, and async option lists, which cannot be resolved
 * synchronously (their summary keeps the raw value / the "N selected" count).
 *
 * Facet targets resolve through the buckets the grid already holds, by bucket label
 * (what a facet filter stores, see `react/filters/use-set-options.ts`) AND by bucket
 * id, so an entry persisted under either convention still reads as a label.
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

  // An async list is loaded by the editor, not by the store — nothing to resolve
  // from here, and a summary must never suspend or fetch.
  if (source?.kind === FilterOptionsKind.Async) return undefined;

  // No option source means "the grid's facets" for a picker target, but "paste your
  // own values" for a free-entry one — the latter has no labels by definition.
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
 *
 * Deliberately CONTEXT-FREE: an entry that is applied right now must summarize even
 * if its target is contextually unavailable in the current view.
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
 * {@link summarizeFilter} with labels resolved — the form every UI surface that has
 * the schema (and, ideally, the current facets) should use. Column filters and
 * advanced filters both go through it; neither needs its own lookup.
 */
export function summarizeFilterEntry<Row>(
  entry: IFilterEntry,
  schema: IGridSchema<Row>,
  facets?: TFacets
): string {
  return summarizeFilter(entry, filterOptionLabeler(filterTargetForEntry(schema, entry), facets));
}
