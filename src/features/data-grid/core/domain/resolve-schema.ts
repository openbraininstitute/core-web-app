import { resolveContextual } from './grid-context';

import type { ColumnModel } from './column-model';
import type { GridContext } from './grid-context';
import type { GridSchema } from './schema';

export interface ResolvedColumn<Row> extends ColumnModel<Row> {
  /** whether this column exposes a filter in the current context */
  filterAvailable: boolean;
}

/**
 * Resolve a schema against a context: drop columns that are unavailable and
 * compute per-column filter availability. The order of {@link GridSchema.columns}
 * is preserved (it is the canonical column order).
 */
export function resolveColumns<Row>(
  schema: GridSchema<Row>,
  ctx: GridContext
): Array<ResolvedColumn<Row>> {
  return schema.columns
    .filter((c) => resolveContextual(c.available ?? true, ctx))
    .map((c) => ({
      ...c,
      filterAvailable: c.filter ? resolveContextual(c.filter.available ?? true, ctx) : false,
    }));
}

/** Column ids hidden when no persisted visibility exists. */
export function defaultHiddenColumnIds<Row>(schema: GridSchema<Row>): string[] {
  return schema.columns.filter((c) => c.hiddenByDefault).map((c) => c.id);
}

/** Whether selection is enabled for the schema in the given context. */
export function isSelectionEnabled<Row>(schema: GridSchema<Row>, ctx: GridContext): boolean {
  return schema.selection ? resolveContextual(schema.selection.enabled, ctx) : false;
}
