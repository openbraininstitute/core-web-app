import { resolveContextual } from './contextual';

import type { IFilterTarget } from './column-model';
import type { TFilterModel } from './filter-model';
import type { IGridContext, TContextualValue } from './grid-context';
import type { IGridSchema } from './schema';

/**
 * ADVANCED FILTERS — schema-level filters that have NO column in the grid.
 *
 * Many entitycore endpoints accept whole families of query params that never appear
 * as a column (`GET /cell-morphology` takes the entire `cell_morphology_protocol__*`
 * family). Those are declared on {@link IGridSchema.advancedFilters} and surfaced by
 * the toolbar's filter menubar instead of a column header.
 *
 * ONE FILTER MODEL, TWO SURFACES: an advanced filter IS an {@link IFilterTarget} —
 * the exact vocabulary a column's "match by" target uses (`id`, `label`, `field`,
 * `operators`, `options`, `facetKey`, `description`, `freeEntry`, `available`). The
 * same operator registry, the same value editors, the same serializer strategies
 * apply; only the surface that opens the editor differs. There is deliberately no
 * parallel type hierarchy.
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
 * NAMESPACE for advanced-filter entries in {@link IGridState.filters}.
 *
 * Advanced filters live in the SAME `filters` record as column filters so they
 * serialize, persist, reset and list in the active-filters popover through the
 * existing paths untouched. To guarantee they can never collide with a column id,
 * their key is `adv:<groupId>:<filterId>` — a column id containing `:` has never
 * been legal (ids are used verbatim as AG Grid col ids and as backend field
 * fallbacks), so the prefix is unambiguous in both directions.
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
 * One entry of the advanced-filters panel, paired with its state key and owning
 * group. Its two producers are {@link resolveAdvancedFilterGroups} (a schema-level
 * advanced filter) and `resolveFilterPanelGroups` (a currently-hidden AUXILIARY
 * column, whose key is the COLUMN ID) — the panel treats them identically.
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
  /**
   * Every field this entry can be matched by. Exactly one for a schema-level
   * advanced filter; an auxiliary column contributes all of ITS targets, so the
   * panel offers the same "match by" switch its header would.
   */
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
 * Every declared advanced filter keyed by its state key, CONTEXT-FREE.
 *
 * Serialization and hydration must not depend on the UI context: a persisted entry
 * for a filter that is merely unavailable right now must still resolve to its field
 * (and must not be silently re-pointed at another one).
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
 * pin the rest to their def's target id.
 *
 * This is a CORRECTNESS guard, not tidiness: an orphaned `adv:…` key would fall
 * through the serializer's column lookup and be emitted as a query param literally
 * named `adv:group:filter__in`. Persisted state outlives schema edits, so the entry
 * has to go.
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
