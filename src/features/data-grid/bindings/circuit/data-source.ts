import { chunk, flatMap } from 'es-toolkit/compat';
import pMap from 'p-map';

import {
  getCircuitHierarchyByDerivation,
  getCircuits,
} from '@/api/entitycore/queries/model/circuit';
import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { circuitScaleFilter } from '@/entity-configuration/domain/model/circuit';
import {
  buildFilteredHierarchyTree,
  CircuitRepresentationView,
  getAllCircuitIds,
} from '@/ui/segments/explore/circuit/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import { createEntitycorePagedDataSource } from '../entitycore/data-source.paged';
import { serializeQuery } from '../entitycore/query-serializer';

import type { QueryClient } from '@tanstack/react-query';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { HierarchyTreeResponse } from '@/api/entitycore/types/shared/hierarchy';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import type { IGridDataSource, IGridPage, IGridQuery, IGridSchema } from '../../core';

/** Marker param, injected by the plugin body via `extraParams`, selecting the view. */
export const CIRCUIT_VIEW_PARAM = '__view';

const HIERARCHY_CHUNK_SIZE = 30;
const HIERARCHY_CONCURRENCY = 5;

export interface ICircuitDataSourceOptions {
  /** the circuit grid schema (resolves column ids → server fields for serialize). */
  schema: IGridSchema<ICircuit>;
  workspace: WorkspaceContext;
  /** shared React Query client — the 3 hierarchy fetches reuse the hook cache keys. */
  queryClient: QueryClient;
}

/**
 * Circuits the current filters actually MATCH, across the whole tree.
 *
 * The tree keeps a non-matching node only as a path to a matching descendant — those
 * carry `isFiltered: false` and must not be counted. With no filter applied every node
 * matches, so this is simply "every circuit in the hierarchy": the roots alone are not a
 * comparable number, since the tree shows their whole subtree too.
 */
function countMatchingNodes(nodes: ReadonlyArray<unknown>): number {
  return nodes.reduce<number>((acc, node) => {
    const { isFiltered, sub_circuits: children } = node as {
      isFiltered?: boolean;
      sub_circuits?: ReadonlyArray<unknown>;
    };
    return acc + (isFiltered ? 1 : 0) + countMatchingNodes(children ?? []);
  }, 0);
}

/** Drop the internal view marker so it never leaks into an entitycore request. */
function withoutViewParam(params: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!params) return {};
  const { [CIRCUIT_VIEW_PARAM]: _view, ...rest } = params;
  return rest;
}

/**
 * View-aware circuit {@link IGridDataSource}, branching on `query.params.__view`:
 *
 * - **flat** delegates to {@link createEntitycorePagedDataSource}, so server params are
 *   identical to every standard entity.
 * - **hierarchy** does 3 fetches (reusing the `use-hierarchy` cache keys) and returns the
 *   root nodes as a single page, `sub_circuits` riding along for the recursive detail.
 *   `order_by` is ignored — tree order is fixed.
 */
export function createCircuitDataSource(
  options: ICircuitDataSourceOptions
): IGridDataSource<ICircuit> {
  const { schema, workspace, queryClient } = options;

  const flatSource = createEntitycorePagedDataSource<ICircuit>({
    dataType: ExtendedEntitiesTypeDict.Circuit,
    schema,
    context: workspace,
  });

  async function fetchHierarchy(query: IGridQuery): Promise<IGridPage<ICircuit>> {
    const { virtualLabId, projectId } = workspace;

    // 1. derivation tree
    const tree = await queryClient.fetchQuery<HierarchyTreeResponse>({
      queryKey: keyBuilder.circuitsByDerivationTree({
        virtualLabId,
        projectId,
        derivationType: DerivationTypeDictionary.CircuitExtraction,
      }),
      queryFn: () =>
        getCircuitHierarchyByDerivation({
          context: workspace,
          derivation_type: DerivationTypeDictionary.CircuitExtraction,
        }),
      staleTime: Number.POSITIVE_INFINITY,
    });

    // 2. every circuit in the tree, enriched with derivations
    const ids = getAllCircuitIds(tree);
    const idChunks = chunk(ids, HIERARCHY_CHUNK_SIZE);
    const fullResponses = await pMap(
      idChunks,
      (chunkIds) =>
        queryClient.fetchQuery<EntityCoreResponse<ICircuit>>({
          queryKey: keyBuilder.manyCircuits({
            page: 1,
            page_size: DEFAULT_PAGE_SIZE,
            id__id: chunkIds,
            withFacets: false,
            virtualLabId,
            projectId,
            expand: 'generated_from_derivations',
            ...circuitScaleFilter,
          }),
          queryFn: () =>
            getCircuits({
              withFacets: false,
              context: virtualLabId && projectId ? workspace : undefined,
              expand: 'generated_from_derivations',
              filters: {
                page: 1,
                page_size: DEFAULT_PAGE_SIZE,
                id__in: chunkIds,
                ...circuitScaleFilter,
              },
            }),
        }),
      { concurrency: HIERARCHY_CONCURRENCY }
    );
    const fullResult: EntityCoreResponse<ICircuit> = {
      data: flatMap(fullResponses, (r) => r.data),
      facets: undefined,
      pagination: { page: 1, page_size: DEFAULT_PAGE_SIZE, total_items: ids.length },
    };

    // 3. current filters across ALL pages, so the tree builder can mark filtered-in
    //    vs grayed-out nodes. order_by is dropped: tree order is fixed.
    const serialized = serializeQuery(
      { ...query, params: withoutViewParam(query.params) },
      schema,
      {
        searchMode: 'ilike',
      }
    );
    const { page: _page, page_size: _pageSize, order_by: _orderBy, ...filterParams } = serialized;

    const pageFilters = (page: number) => ({
      ...circuitScaleFilter,
      ...filterParams,
      page,
      page_size: DEFAULT_PAGE_SIZE,
    });

    const first = await queryClient.fetchQuery<EntityCoreResponse<ICircuit>>({
      queryKey: keyBuilder.manyCircuits({ ...pageFilters(1), virtualLabId, projectId }),
      queryFn: () =>
        getCircuits({
          withFacets: false,
          context: workspace,
          filters: pageFilters(1),
        }),
    });
    const totalPages = Math.max(
      1,
      Math.ceil(first.pagination.total_items / first.pagination.page_size)
    );
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const filteredResponses = await pMap(
      pages,
      (page) =>
        queryClient.fetchQuery<EntityCoreResponse<ICircuit>>({
          queryKey: keyBuilder.manyCircuits({ ...pageFilters(page), virtualLabId, projectId }),
          queryFn: () =>
            getCircuits({
              withFacets: false,
              context: workspace,
              filters: pageFilters(page),
            }),
        }),
      { concurrency: HIERARCHY_CONCURRENCY }
    );
    const filteredResult: EntityCoreResponse<ICircuit> = {
      data: flatMap(filteredResponses, (r) => r.data).map((c) => ({ ...c, isFiltered: true })),
      facets: undefined,
      pagination: {
        page: 1,
        page_size: DEFAULT_PAGE_SIZE,
        total_items: flatMap(filteredResponses, (r) => r.data).length,
      },
    };

    const roots = buildFilteredHierarchyTree(
      tree,
      fullResult,
      filteredResult
    ) as unknown as ICircuit[];

    return { rows: roots, total: countMatchingNodes(roots), singlePage: true };
  }

  return {
    async fetch(query: IGridQuery, signal?: AbortSignal): Promise<IGridPage<ICircuit>> {
      const view = query.params?.[CIRCUIT_VIEW_PARAM];
      if (view === CircuitRepresentationView.Hierarchy) {
        return fetchHierarchy(query);
      }
      return flatSource.fetch({ ...query, params: withoutViewParam(query.params) }, signal);
    },
  };
}
