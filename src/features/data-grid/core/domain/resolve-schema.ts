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
   * The filter targets available in this context (a legacy flat filter resolves to
   * exactly one). Optional so hand-built resolved columns stay valid; consumers
   * fall back to `resolveFilterTargets(column)`.
   */
  filterTargets?: ReadonlyArray<IFilterTarget>;
}

/**
 * Resolve a schema against a context — the single place the contextual rules
 * (availability, order, filter availability, default visibility) are evaluated:
 *
 * 1. drop columns whose `available` resolves to `false` for this context;
 * 2. order the survivors by their resolved `order` weight ("where"), keeping
 *    declaration order for ties and for columns without an explicit order (so a
 *    schema that declares no `order` is unchanged — no regression);
 * 3. surface per-column `filterAvailable` and `hiddenByDefaultResolved`.
 *
 * The result is the canonical, context-resolved column list; the persisted
 * user layout (drag reorder / chooser) is applied on top of it by the renderer.
 */
export function resolveColumns<Row>(
  schema: IGridSchema<Row>,
  ctx: IGridContext
): Array<IResolvedColumn<Row>> {
  return schema.columns
    .map((column, declarationIndex) => ({ column, declarationIndex }))
    .filter(({ column }) => resolveContextual(column.available ?? true, ctx))
    .map(({ column, declarationIndex }) => ({
      column,
      declarationIndex,
      order: column.order === undefined ? undefined : resolveContextual(column.order, ctx),
    }))
    .sort((a, b) => {
      // columns with an explicit order sort by it; the rest hold their slot
      const ao = a.order ?? a.declarationIndex;
      const bo = b.order ?? b.declarationIndex;
      return ao === bo ? a.declarationIndex - b.declarationIndex : ao - bo;
    })
    .map(({ column }) => ({
      ...column,
      filterAvailable: column.filter
        ? resolveContextual(column.filter.available ?? true, ctx)
        : false,
      filterTargets: availableFilterTargets(column, ctx),
      hiddenByDefaultResolved: resolveContextual(column.hiddenByDefault ?? false, ctx),
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
