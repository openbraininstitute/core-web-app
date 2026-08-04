import { resolveContextual } from './contextual';

import type { IFilterTarget } from './column-model';
import type { TFilterModel } from './filter-model';
import type { IGridContext, TContextualValue } from './grid-context';
import type { IGridSchema } from './schema';

/**
 * A schema-level filter with no column in the grid, declared on
 * {@link IGridSchema.advancedFilters} and surfaced by the toolbar's filter menubar.
 * It IS an {@link IFilterTarget}, so the same operators, editors and serializers
 * apply — deliberately no parallel type hierarchy.
 */
export type TAdvancedFilterDef = IFilterTarget;

/** A named section of the filter menubar (one top-level menu). */
export interface IAdvancedFilterGroup {
  /** stable id, part of the state key — see {@link advancedFilterKey} */
  id: string;
  /** menubar label (e.g. `'Protocol'`) */
  label: string;
  /** optional help text shown at the top of the group's menu */
  description?: string;
  /** contextual availability (default: true) */
  available?: TContextualValue<boolean>;
  filters: ReadonlyArray<TAdvancedFilterDef>;
}

/**
 * Namespace for advanced-filter entries, which share the `filters` record with
 * column filters. A column id may never contain `:` (ids are used verbatim as AG
 * Grid col ids and backend field fallbacks), so the prefix cannot collide.
 */
export const ADVANCED_FILTER_KEY_PREFIX = 'adv:';

/** `adv:<groupId>:<filterId>` — the state key for one advanced filter. */
export function advancedFilterKey(groupId: string, filterId: string): string {
  return `${ADVANCED_FILTER_KEY_PREFIX}${groupId}:${filterId}`;
}

/** Whether a `filters` key belongs to an advanced filter rather than a column. */
export function isAdvancedFilterKey(key: string): boolean {
  return key.startsWith(ADVANCED_FILTER_KEY_PREFIX);
}

/**
 * One entry of the advanced-filters panel, with its state key and owning group.
 * Produced either from a schema-level advanced filter or from a currently-hidden
 * auxiliary column (whose key is the column id); the panel treats both identically.
 */
export interface IResolvedAdvancedFilter {
  /** key into {@link IGridState.filters} — `adv:<group>:<filter>`, or a column id */
  key: string;
  groupId: string;
  groupLabel: string;
  /** name shown in the panel: the filter's label, or an auxiliary column's header */
  label: string;
  /** the primary/default target — `targets[0]` */
  def: TAdvancedFilterDef;
  /** Every field this entry can be matched by; one for a schema-level advanced filter. */
  targets: ReadonlyArray<TAdvancedFilterDef>;
}

/** A group whose filters have been resolved against the context. */
export interface IResolvedAdvancedFilterGroup {
  id: string;
  label: string;
  description?: string;
  filters: ReadonlyArray<IResolvedAdvancedFilter>;
}

/**
 * The advanced filter groups offered in this context: groups and filters whose
 * `available` resolves to `false` are dropped, and empty groups with them.
 */
export function resolveAdvancedFilterGroups<Row>(
  schema: IGridSchema<Row>,
  ctx: IGridContext
): ReadonlyArray<IResolvedAdvancedFilterGroup> {
  return (schema.advancedFilters ?? [])
    .filter((group) => resolveContextual(group.available ?? true, ctx))
    .map((group) => ({
      id: group.id,
      label: group.label,
      description: group.description,
      filters: group.filters
        .filter((def) => resolveContextual(def.available ?? true, ctx))
        .map((def) => ({
          key: advancedFilterKey(group.id, def.id),
          groupId: group.id,
          groupLabel: group.label,
          label: def.label,
          def,
          targets: [def],
        })),
    }))
    .filter((group) => group.filters.length > 0);
}

/**
 * Every declared advanced filter keyed by its state key. Deliberately context-free:
 * a persisted entry for a currently-unavailable filter must still resolve to its field.
 */
export function advancedFilterDefsByKey<Row>(
  schema: IGridSchema<Row>
): ReadonlyMap<string, TAdvancedFilterDef> {
  const out = new Map<string, TAdvancedFilterDef>();
  for (const group of schema.advancedFilters ?? []) {
    for (const def of group.filters) out.set(advancedFilterKey(group.id, def.id), def);
  }
  return out;
}

/**
 * Drop advanced-filter entries whose definition no longer exists in the schema, and
 * pin the rest to their def's target id. An orphaned `adv:…` key would otherwise fall
 * through the serializer's column lookup and be emitted as a literal query param.
 */
export function pruneAdvancedFilters<Row>(
  filters: TFilterModel,
  schema: IGridSchema<Row>
): TFilterModel {
  const defs = advancedFilterDefsByKey(schema);
  const out: TFilterModel = {};
  let changed = false;

  for (const [key, entry] of Object.entries(filters)) {
    if (!isAdvancedFilterKey(key)) {
      out[key] = entry;
      continue;
    }
    const def = defs.get(key);
    if (!def) {
      changed = true;
      continue;
    }
    if (entry.targetId === def.id) {
      out[key] = entry;
      continue;
    }
    out[key] = { ...entry, targetId: def.id };
    changed = true;
  }

  return changed ? out : filters;
}
