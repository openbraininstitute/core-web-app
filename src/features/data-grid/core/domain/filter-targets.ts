import { FreeEntryKind } from './column-model';
import { resolveContextual } from './contextual';

import type { IColumnModel, IFilterTarget, TFreeEntryKind } from './column-model';
import type { TFilterModel } from './filter-model';
import type { IGridContext } from './grid-context';
import type { IGridSchema } from './schema';

/**
 * Filter TARGETS — the "which backend field" axis of a column filter, orthogonal to
 * the operator axis. One grid column (Species) can be filtered by several fields
 * (`subject__species__name`, `subject__species__id`), each with its own operators
 * and option source.
 *
 * Back-compat is the whole point of this module: a column that declares no
 * {@link IColumnFilter.targets} still has exactly ONE target, synthesised from the
 * flat `{ field, operators, options, facetKey, description }` props, with the same
 * field-resolution order the serializer has always used
 * (`filter.field ?? column.field ?? column.id`). Nothing about such a column's
 * serialization changes.
 */

/** id of the target synthesised from a legacy single-field `filter` declaration. */
export const DEFAULT_FILTER_TARGET_ID = 'default';

/**
 * The column's filter targets: the declared ones, or a single synthesised target
 * for a legacy flat filter. Returns `[]` for a column with no filter declaration
 * (callers fall back to `column.field ?? column.id`, as before).
 */
export function resolveFilterTargets<Row>(column: IColumnModel<Row>): ReadonlyArray<IFilterTarget> {
  const filter = column.filter;
  if (!filter) return [];
  if (filter.targets?.length) return filter.targets;
  return [
    {
      id: DEFAULT_FILTER_TARGET_ID,
      label: column.header,
      field: filter.field ?? column.field ?? column.id,
      operators: filter.operators,
      options: filter.options,
      facetKey: filter.facetKey,
      description: filter.description,
    },
  ];
}

/** {@link resolveFilterTargets} minus the targets unavailable in this context. */
export function availableFilterTargets<Row>(
  column: IColumnModel<Row>,
  ctx: IGridContext
): ReadonlyArray<IFilterTarget> {
  return resolveFilterTargets(column).filter((t) => resolveContextual(t.available ?? true, ctx));
}

/**
 * The target a filter entry acts on: the one it names, else the first (the default).
 * An unknown/absent `targetId` therefore degrades to today's single-field behaviour.
 */
export function activeFilterTarget(
  targets: ReadonlyArray<IFilterTarget>,
  targetId?: string
): IFilterTarget | undefined {
  const named = targetId == null ? undefined : targets.find((t) => t.id === targetId);
  return named ?? targets[0];
}

/**
 * What a free-entry (paste-a-list) target collects, or `null` when the target is not
 * free-entry at all. A target with an option source is a picker, never free entry;
 * the synthesised legacy target is never free entry either, because its missing
 * `options` has always meant "fall back to the grid's facets".
 *
 * The default for a declared target with no options is {@link FreeEntryKind.Uuid} —
 * every such target predating this function was an id target — so a target that
 * collects plain strings must say so with {@link IFilterTarget.freeEntry}.
 */
export function freeEntryKind(target: IFilterTarget): TFreeEntryKind | null {
  if (target.options) return null;
  if (target.id === DEFAULT_FILTER_TARGET_ID) return null;
  return target.freeEntry ?? FreeEntryKind.Uuid;
}

/**
 * A target with no option source is a FREE-ENTRY target (paste ids/values) rather
 * than a facet picker. Never true for the synthesised legacy target, whose missing
 * `options` has always meant "fall back to the grid's facets".
 */
export function isFreeEntryTarget(target: IFilterTarget): boolean {
  return freeEntryKind(target) !== null;
}

/**
 * Persisted filter entries predate `targetId`. Fill in the default target (and
 * repair an entry naming a target that no longer exists) so an old sessionStorage
 * snapshot still resolves to a field. Returns the SAME reference when nothing
 * needed fixing.
 */
export function hydrateFilterTargetIds<Row>(
  filters: TFilterModel,
  schema: IGridSchema<Row>
): TFilterModel {
  const byId = new Map(schema.columns.map((c) => [c.id, c] as const));
  const out: TFilterModel = {};
  let changed = false;

  for (const [columnId, entry] of Object.entries(filters)) {
    const column = byId.get(columnId);
    const targets = column ? resolveFilterTargets(column) : [];
    const fallback = targets[0]?.id;
    const known = entry.targetId != null && targets.some((t) => t.id === entry.targetId);
    if (known || fallback === undefined) {
      out[columnId] = entry;
      continue;
    }
    out[columnId] = { ...entry, targetId: fallback };
    changed = true;
  }

  return changed ? out : filters;
}
