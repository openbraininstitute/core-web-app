import { resolveAdvancedFilterGroups } from './advanced-filters';
import { resolveFilterTargets } from './filter-targets';
import { resolveColumns } from './resolve-schema';

import type { IResolvedAdvancedFilter, IResolvedAdvancedFilterGroup } from './advanced-filters';
import type { IGridContext } from './grid-context';
import type { IGridSchema } from './schema';

/**
 * THE ADVANCED-FILTERS PANEL IS DERIVED, NOT DECLARED.
 *
 * Every backend-filterable field is represented exactly once in a schema — as a
 * column (visible or {@link IColumnModel.auxiliary}) or as an entry in
 * {@link IGridSchema.advancedFilters}, never both. The toolbar panel is then a
 * function of that declaration plus the CURRENT column visibility:
 *
 *     panel = schema.advancedFilters + auxiliary columns currently hidden
 *
 * Ticking an auxiliary column in the chooser therefore takes it OUT of the panel
 * (its filter now lives in the column header) and unticking puts it back. The field
 * is offered by exactly one surface at any moment, and the user never has to guess
 * which of two places a filter they applied is now hiding in.
 *
 * FILTER-STATE CONTINUITY is what makes that safe: an auxiliary column's entry is
 * keyed by its COLUMN ID in both surfaces (advanced filters use the disjoint
 * `adv:…` namespace), so ticking/unticking moves only the editor, never the state.
 * The applied entry keeps its key, its `targetId` and its value; the serializer
 * resolves it through the column lookup regardless of visibility, so it is never
 * dropped, never duplicated, and never emitted twice.
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
      // THE COLUMN ID, not an `adv:` key — see the continuity note above.
      key: column.id,
      groupId,
      groupLabel,
      // the column's header, not the target's label: the panel row and the column
      // the user ticks to move it must read as the same thing
      label: column.header,
      def: targets[0],
      targets,
    });
  }

  return out;
}

/**
 * The groups the advanced-filters panel shows right now: the schema's own advanced
 * filters, plus the auxiliary columns that are currently hidden.
 *
 * WHERE the auxiliary entries land is a presentation choice made here so the panel
 * stays simple: a schema whose advanced filters resolve to at most ONE group keeps a
 * FLAT list (the entries are appended to it), because a two-tab menubar whose second
 * tab appears and disappears with a checkbox is worse than a slightly longer list.
 * A genuinely grouped schema gets a dedicated {@link AUXILIARY_FILTER_GROUP_LABEL}
 * group instead, so its existing groups keep their meaning.
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
