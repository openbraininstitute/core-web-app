import { resolveAdvancedFilterGroups } from './advanced-filters';
import { resolveFilterTargets } from './filter-targets';
import { resolveColumns } from './resolve-schema';

import type { IResolvedAdvancedFilter, IResolvedAdvancedFilterGroup } from './advanced-filters';
import type { IGridContext } from './grid-context';
import type { IGridSchema } from './schema';

/**
 * The advanced-filters panel is derived, not declared:
 * `panel = schema.advancedFilters + auxiliary columns currently hidden`. Ticking an
 * auxiliary column moves its filter into the column header and out of the panel, so
 * a field is offered by exactly one surface at a time.
 *
 * An auxiliary column's entry is keyed by its COLUMN ID in both surfaces (advanced
 * filters use the disjoint `adv:…` namespace), so ticking moves only the editor and
 * an applied filter keeps its key, `targetId` and value.
 */

/** Group id for the auxiliary columns' filters when they need a group of their own. */
export const AUXILIARY_FILTER_GROUP_ID = 'columns';

/** Menubar label for {@link AUXILIARY_FILTER_GROUP_ID}. */
export const AUXILIARY_FILTER_GROUP_LABEL = 'Columns';

/**
 * The panel entries contributed by the auxiliary columns that are currently HIDDEN.
 * A visible auxiliary column contributes nothing — its header owns its filter.
 */
function hiddenAuxiliaryFilters<Row>(
  schema: IGridSchema<Row>,
  ctx: IGridContext,
  hiddenColumnIds: ReadonlyArray<string>,
  groupId: string,
  groupLabel: string
): IResolvedAdvancedFilter[] {
  const hidden = new Set(hiddenColumnIds);
  const out: IResolvedAdvancedFilter[] = [];

  for (const column of resolveColumns(schema, ctx)) {
    if (!column.auxiliary || !hidden.has(column.id) || !column.filterAvailable) continue;
    const targets = column.filterTargets?.length
      ? column.filterTargets
      : resolveFilterTargets(column);
    if (targets.length === 0) continue;
    out.push({
      // The column id, not an `adv:` key — see the continuity note above.
      key: column.id,
      groupId,
      groupLabel,
      // The column's header, so the panel row and the chooser entry read alike.
      label: column.header,
      def: targets[0],
      targets,
    });
  }

  return out;
}

/**
 * The groups the advanced-filters panel shows right now: the schema's own advanced
 * filters, plus the auxiliary columns that are currently hidden. A schema resolving
 * to at most one group stays flat (auxiliary entries are appended to it), avoiding a
 * second menubar tab that blinks in and out with a checkbox; a grouped schema gets a
 * dedicated {@link AUXILIARY_FILTER_GROUP_LABEL} group.
 */
export function resolveFilterPanelGroups<Row>(
  schema: IGridSchema<Row>,
  ctx: IGridContext,
  hiddenColumnIds: ReadonlyArray<string>
): ReadonlyArray<IResolvedAdvancedFilterGroup> {
  const declared = resolveAdvancedFilterGroups(schema, ctx);
  const flat = declared.length <= 1;
  const host = flat ? declared[0] : undefined;

  const auxiliary = hiddenAuxiliaryFilters(
    schema,
    ctx,
    hiddenColumnIds,
    host?.id ?? AUXILIARY_FILTER_GROUP_ID,
    host?.label ?? AUXILIARY_FILTER_GROUP_LABEL
  );
  if (auxiliary.length === 0) return declared;

  if (!flat) {
    return [
      ...declared,
      {
        id: AUXILIARY_FILTER_GROUP_ID,
        label: AUXILIARY_FILTER_GROUP_LABEL,
        filters: auxiliary,
      },
    ];
  }

  if (!host) {
    return [
      { id: AUXILIARY_FILTER_GROUP_ID, label: AUXILIARY_FILTER_GROUP_LABEL, filters: auxiliary },
    ];
  }
  return [{ ...host, filters: [...host.filters, ...auxiliary] }];
}
