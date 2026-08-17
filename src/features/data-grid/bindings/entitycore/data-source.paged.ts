import { FACETS_ONLY_PAGE } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { TEntitycoreParams } from '@/features/data-grid/bindings/entitycore/query-serializer';
import type {
  IGridDataSource,
  IGridPage,
  IGridQuery,
  IGridSchema,
  TFacets,
} from '@/features/data-grid/core';
import type { WorkspaceContext } from '@/types/common';

export type TListQueryFn<Row> = (args: {
  filters: Record<string, unknown>;
  withFacets?: boolean;
  context: WorkspaceContext;
}) => Promise<EntityCoreResponse<Row> | undefined>;

export interface IEntitycorePagedDataSourceOptions<Row> {
  /** routes to the entity's domain config (single source of truth) */
  dataType: TExtendedEntitiesTypeDict;
  /** schema, used to resolve column ids → backend fields for sort/filter */
  schema: IGridSchema<Row>;
  context: WorkspaceContext;
  /** overrides the entity's domain `query.list`; must be server-side paginated */
  listQueryFn?: TListQueryFn<Row>;
  withFacets?: boolean;
  /** post-processes the serialized params (applied last) */
  transformParams?: (params: TEntitycoreParams) => TEntitycoreParams;
}

/**
 * The default {@link IGridDataSource}: one server page per request, delegating to the
 * entity's domain config (`api.query.list`), which owns endpoint, `narrowFilters`,
 * `ilikeSearchEnabled` and facets. The grid contributes only page/sort/filter/search.
 */
export function createEntitycorePagedDataSource<Row>(
  options: IEntitycorePagedDataSourceOptions<Row>
): IGridDataSource<Row> {
  const { dataType, schema, context, listQueryFn, withFacets = true, transformParams } = options;
  const entity = getEntityByExtendedType({ type: dataType });
  const searchMode: 'ilike' | 'plain' = entity?.api?.config?.ilikeSearchEnabled ? 'ilike' : 'plain';

  const paramsFor = (query: IGridQuery): TEntitycoreParams => {
    const serialized = serializeQuery(query, schema, { searchMode });
    return transformParams ? transformParams(serialized) : serialized;
  };
  const run = (args: Parameters<TListQueryFn<Row>>[0]) =>
    (listQueryFn ? listQueryFn(args) : entity?.api?.query?.list?.(args)) as Promise<
      EntityCoreResponse<Row> | undefined
    >;

  const fetch = async (query: IGridQuery): Promise<IGridPage<Row>> => {
    // Never `with_facets` here: faceting the whole filtered set costs far more than
    // the page itself, and the rows would wait on it. See `fetchFacets`.
    const res = await run({ filters: paramsFor(query), withFacets: false, context });

    return {
      rows: res?.data ?? [],
      total: res?.pagination?.total_items ?? 0,
    };
  };

  // Left undefined when the host fetches facets itself, so the grid does not run a
  // second, losing request alongside the host's own.
  if (!withFacets) return { fetch };

  const fetchFacets = async (query: IGridQuery): Promise<TFacets | undefined> => {
    // Same filters as the rows, so counts describe exactly what is listed — but no
    // rows, since only the buckets are read.
    const res = await run({
      filters: { ...paramsFor(query), ...FACETS_ONLY_PAGE },
      withFacets: true,
      context,
    });
    return res?.facets as TFacets | undefined;
  };

  return { fetch, fetchFacets };
}
