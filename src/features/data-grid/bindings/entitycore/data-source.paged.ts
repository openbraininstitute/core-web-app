import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';

import { serializeQuery } from './query-serializer';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import type { IGridDataSource, IGridPage, IGridQuery, IGridSchema } from '../../core';
import type { TEntitycoreParams } from './query-serializer';

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

  return {
    async fetch(query: IGridQuery): Promise<IGridPage<Row>> {
      const serialized = serializeQuery(query, schema, { searchMode });
      const filters = transformParams ? transformParams(serialized) : serialized;
      const args = { filters, withFacets, context };
      const res = (await (listQueryFn ? listQueryFn(args) : entity?.api?.query?.list?.(args))) as
        | EntityCoreResponse<Row>
        | undefined;

      return {
        rows: res?.data ?? [],
        total: res?.pagination?.total_items ?? 0,
        facets: res?.facets as IGridPage<Row>['facets'],
      };
    },
  };
}
