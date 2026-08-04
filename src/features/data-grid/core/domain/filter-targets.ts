import { FreeEntryKind } from './column-model';
import { resolveContextual } from './contextual';

import type { IColumnModel, IFilterTarget, TFreeEntryKind } from './column-model';
import type { TFilterModel } from './filter-model';
import type { IGridContext } from './grid-context';
import type { IGridSchema } from './schema';

/**
 * Filter targets — the "which backend field" axis of a column filter, orthogonal to
 * the operator axis (Species can filter by `…species__name` or `…species__id`).
 * A column declaring no {@link IColumnFilter.targets} gets exactly one synthesised
 * from its flat props, resolving the field as `filter.field ?? column.field ?? column.id`.
 */

/** id of the target synthesised from a flat single-field `filter` declaration. */
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
 * free-entry at all. A target with an option source is a picker; the synthesised
 * default target never is either, since its missing `options` means "use the grid's
 * facets". A declared optionless target defaults to {@link FreeEntryKind.Uuid}, so one
 * collecting plain strings must set {@link IFilterTarget.freeEntry}.
 */
export function freeEntryKind(target: IFilterTarget): TFreeEntryKind | null {
  if (target.options) return null;
  if (target.id === DEFAULT_FILTER_TARGET_ID) return null;
  return target.freeEntry ?? FreeEntryKind.Uuid;
}

/**
 * Whether a target collects pasted ids/values rather than offering a facet picker.
 * Never true for the synthesised default target.
 */
export function isFreeEntryTarget(target: IFilterTarget): boolean {
  return freeEntryKind(target) !== null;
}

/**
 * Fill in the default `targetId` on entries lacking one, and repair entries naming a
 * target that no longer exists, so an old persisted snapshot still resolves to a
 * field. Returns the same reference when nothing needed fixing.
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
