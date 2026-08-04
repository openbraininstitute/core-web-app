import { resolveContextual } from './contextual';
import { availableFilterTargets } from './filter-targets';

import type { IColumnModel, IFilterTarget } from './column-model';
import type { IGridContext } from './grid-context';
import type { IGridSchema } from './schema';

export interface IResolvedColumn<Row> extends IColumnModel<Row> {
  /** whether this column exposes a filter in the current context */
  filterAvailable: boolean;
  /** whether this column starts hidden in the current context */
  hiddenByDefaultResolved: boolean;
  /**
   * Filter targets available in this context (a flat filter resolves to exactly one).
   * Optional; consumers fall back to `resolveFilterTargets(column)`.
   */
  filterTargets?: ReadonlyArray<IFilterTarget>;
}

/**
 * Resolve a schema against a context — the single place the contextual rules
 * (availability, order, filter availability, default visibility) are evaluated:
 *
 * 1. drop columns whose `available` resolves to `false` for this context;
 * 2. order the survivors by their resolved `order` weight, keeping declaration order
 *    for ties and for columns without an explicit order;
 * 3. surface per-column `filterAvailable` and `hiddenByDefaultResolved`.
 *
 * The persisted user layout (drag reorder / chooser) is applied on top by the renderer.
 */
export function resolveColumns<Row>(
  schema: IGridSchema<Row>,
  ctx: IGridContext
): Array<IResolvedColumn<Row>> {
  // Whole-grid sort gate: when it resolves false, no column sorts whatever it declares.
  const gridSortable = resolveContextual(schema.sortable ?? true, ctx);
  return schema.columns
    .map((column, declarationIndex) => ({ column, declarationIndex }))
    .filter(({ column }) => resolveContextual(column.available ?? true, ctx))
    .map(({ column, declarationIndex }) => ({
      column,
      declarationIndex,
      order: column.order === undefined ? undefined : resolveContextual(column.order, ctx),
    }))
    .sort((a, b) => {
      const ao = a.order ?? a.declarationIndex;
      const bo = b.order ?? b.declarationIndex;
      return ao === bo ? a.declarationIndex - b.declarationIndex : ao - bo;
    })
    .map(({ column }) => ({
      ...column,
      sortable: gridSortable ? column.sortable : false,
      filterAvailable: column.filter
        ? resolveContextual(column.filter.available ?? true, ctx)
        : false,
      filterTargets: availableFilterTargets(column, ctx),
      // `auxiliary` implies hidden-by-default; an explicit `hiddenByDefault` wins.
      hiddenByDefaultResolved: resolveContextual(
        column.hiddenByDefault ?? column.auxiliary ?? false,
        ctx
      ),
    }));
}

/** Column ids hidden by default in this context (used when no persisted layout exists). */
export function defaultHiddenColumnIds<Row>(schema: IGridSchema<Row>, ctx: IGridContext): string[] {
  return resolveColumns(schema, ctx)
    .filter((c) => c.hiddenByDefaultResolved)
    .map((c) => c.id);
}

/** Whether selection is enabled for the schema in the given context. */
export function isSelectionEnabled<Row>(schema: IGridSchema<Row>, ctx: IGridContext): boolean {
  return schema.selection ? resolveContextual(schema.selection.enabled, ctx) : false;
}
