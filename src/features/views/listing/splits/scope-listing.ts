import { resolveFilterTargets } from '@/features/data-grid/core';

import type { IColumnModel, IGridSchema } from '@/features/data-grid/core';
import type { IListingSplitOption } from './types';

/**
 * `schema` without the column filters / advanced filters on `fields`. Columns stay (the
 * saved column layout is shared with the parent listing); only their filter is dropped.
 * Pure: never mutates, and returns the same objects wherever nothing changed.
 */
export function withoutFilterFields<Row>(
  schema: IGridSchema<Row>,
  fields: readonly string[]
): IGridSchema<Row> {
  if (fields.length === 0) return schema;
  const pinned = new Set(fields);

  const columns = schema.columns.map((column): IColumnModel<Row> => {
    const targets = resolveFilterTargets(column);
    const kept = targets.filter((target) => !pinned.has(target.field));
    if (kept.length === targets.length) return column;
    const { filter, ...rest } = column;
    return kept.length === 0 || !filter ? rest : { ...rest, filter: { ...filter, targets: kept } };
  });

  const advancedFilters = schema.advancedFilters
    ?.map((group) => ({
      ...group,
      filters: group.filters.filter((filter) => !pinned.has(filter.field)),
    }))
    .filter((group) => group.filters.length > 0);

  return { ...schema, columns, advancedFilters };
}

/** Grid `id` instance segment: separates a sub-item's session state from its parent's. */
export function listingInstanceId(
  baseId: string | undefined,
  option: IListingSplitOption | undefined
): string | undefined {
  return [baseId, option?.slug].filter(Boolean).join(':') || undefined;
}

export interface IListingScope<D extends { schema: IGridSchema<never> }> {
  definition: D;
  extraQueryParams?: Record<string, unknown>;
  id?: string;
}

/** Apply a split option to a listing: pin its params, strip its filters, isolate its state. */
export function scopeListing<D extends { schema: IGridSchema<never> }>(
  { definition, extraQueryParams, id }: IListingScope<D>,
  option: IListingSplitOption
): IListingScope<D> {
  return {
    definition: {
      ...definition,
      schema: withoutFilterFields(definition.schema, option.pinnedFields),
    },
    // the split's params win over the caller's
    extraQueryParams: { ...extraQueryParams, ...option.params },
    id: listingInstanceId(id, option),
  };
}
