import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';

import { serializeQuery } from './query-serializer';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import type { GridDataSource, GridPage, GridQuery, GridSchema } from '../../core';
import type { EntitycoreParams } from './query-serializer';

export type ListQueryFn<Row> = (args: {
  filters: Record<string, unknown>;
  withFacets?: boolean;
  context: WorkspaceContext;
}) => Promise<EntityCoreResponse<Row> | undefined>;

export interface EntitycorePagedDataSourceOptions<Row> {
  /** routes to the entity's domain config (single source of truth) */
  dataType: TExtendedEntitiesTypeDict;
  /** schema, used to resolve column ids → backend fields for sort/filter */
  schema: GridSchema<Row>;
  context: WorkspaceContext;
  /**
   * loader-scoped override replacing the entity's domain `query.list` (the legacy
   * `listQueryFn` prop). Must return rows in the standard entity shape with
   * server-side pagination.
   */
  listQueryFn?: ListQueryFn<Row>;
  withFacets?: boolean;
  /**
   * host-level post-processing of the serialized params (e.g. merging an
   * `extraQueryParams.order_by` override with the grid's sort). Applied last.
   */
  transformParams?: (params: EntitycoreParams) => EntitycoreParams;
}

/**
 * The default {@link GridDataSource}: one server page per request, delegating to the
 * entity's DOMAIN config (`api.query.list`). The endpoint, query narrowing
 * (`narrowFilters`), `ilikeSearchEnabled` and facets therefore stay a single source
 * of truth in `entity-configuration` — the grid only contributes the page / sort /
 * filter / search params built from its own state.
 */
export function createEntitycorePagedDataSource<Row>(
  options: EntitycorePagedDataSourceOptions<Row>
): GridDataSource<Row> {
  const { dataType, schema, context, listQueryFn, withFacets = true, transformParams } = options;
  const entity = getEntityByExtendedType({ type: dataType });
  const searchMode: 'ilike' | 'plain' = entity?.api?.config?.ilikeSearchEnabled ? 'ilike' : 'plain';

  return {
    async fetch(query: GridQuery): Promise<GridPage<Row>> {
      const serialized = serializeQuery(query, schema, { searchMode });
      const filters = transformParams ? transformParams(serialized) : serialized;
      const args = { filters, withFacets, context };
      const res = (await (listQueryFn ? listQueryFn(args) : entity?.api?.query?.list?.(args))) as
        | EntityCoreResponse<Row>
        | undefined;

      return {
        rows: res?.data ?? [],
        total: res?.pagination?.total_items ?? 0,
        facets: res?.facets as GridPage<Row>['facets'],
      };
    },
  };
}
