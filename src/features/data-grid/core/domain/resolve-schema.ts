import { resolveContextual } from './contextual';

import type { ColumnModel } from './column-model';
import type { GridContext } from './grid-context';
import type { GridSchema } from './schema';

export interface ResolvedColumn<Row> extends ColumnModel<Row> {
  /** whether this column exposes a filter in the current context */
  filterAvailable: boolean;
  /** whether this column starts hidden in the current context */
  hiddenByDefaultResolved: boolean;
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
  schema: GridSchema<Row>,
  ctx: GridContext
): Array<ResolvedColumn<Row>> {
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
      hiddenByDefaultResolved: resolveContextual(column.hiddenByDefault ?? false, ctx),
    }));
}

/** Column ids hidden by default in this context (used when no persisted layout exists). */
export function defaultHiddenColumnIds<Row>(schema: GridSchema<Row>, ctx: GridContext): string[] {
  return resolveColumns(schema, ctx)
    .filter((c) => c.hiddenByDefaultResolved)
    .map((c) => c.id);
}

/** Whether selection is enabled for the schema in the given context. */
export function isSelectionEnabled<Row>(schema: GridSchema<Row>, ctx: GridContext): boolean {
  return schema.selection ? resolveContextual(schema.selection.enabled, ctx) : false;
}
