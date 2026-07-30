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
import type { GridDataSource, GridPage, GridQuery, GridSchema } from '../../core';

/** Marker param, injected by the plugin body via `extraParams`, selecting the view. */
export const CIRCUIT_VIEW_PARAM = '__view';

const HIERARCHY_CHUNK_SIZE = 30;
const HIERARCHY_CONCURRENCY = 5;

export interface CircuitDataSourceOptions {
  /** the circuit grid schema (resolves column ids → server fields for serialize). */
  schema: GridSchema<ICircuit>;
  workspace: WorkspaceContext;
  /** shared React Query client — the 3 hierarchy fetches reuse the hook cache keys. */
  queryClient: QueryClient;
}

/** Drop the internal view marker so it never leaks into an entitycore request. */
function withoutViewParam(params: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!params) return {};
  const { [CIRCUIT_VIEW_PARAM]: _view, ...rest } = params;
  return rest;
}

/**
 * View-aware circuit {@link GridDataSource}. Reads the view from
 * `query.params.__view`:
 *
 * - **flat** delegates to {@link createEntitycorePagedDataSource} (→ `serializeQuery`
 *   → `Circuit.api.query.list`), so the server params are byte-for-byte identical to
 *   every standard entity — and to the legacy flat circuit list.
 * - **hierarchy** runs an imperative version of `use-hierarchy` (3 fetches via
 *   `queryClient.fetchQuery`, reusing the SAME cache keys and the pure tree-builders
 *   `getAllCircuitIds` / `buildFilteredHierarchyTree`) and returns the enriched root
 *   nodes as rows (their `sub_circuits` ride along for the recursive detail). Sorting
 *   is ignored in hierarchy (tree order is fixed), matching legacy.
 */
export function createCircuitDataSource(
  options: CircuitDataSourceOptions
): GridDataSource<ICircuit> {
  const { schema, workspace, queryClient } = options;

  // Flat delegates to the shared paged source — identical params to standard entities.
  const flatSource = createEntitycorePagedDataSource<ICircuit>({
    dataType: ExtendedEntitiesTypeDict.Circuit,
    schema,
    context: workspace,
  });

  async function fetchHierarchy(query: GridQuery): Promise<GridPage<ICircuit>> {
    const { virtualLabId, projectId } = workspace;

    // 1. derivation tree (circuit-extraction) — shared cache key with the hooks.
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

    // 2. full raw hierarchy — every circuit in the tree, enriched with derivations.
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

    // 3. filtered subset — the current header filters/search, across all pages, so
    //    `buildFilteredHierarchyTree` can mark the filtered-in (vs gray-out) nodes.
    //    order_by is dropped (tree order is fixed).
    const serialized = serializeQuery(
      { ...query, params: withoutViewParam(query.params) },
      schema,
      {
        searchMode: 'ilike',
      }
    );
    const { page: _page, page_size: _pageSize, order_by: _orderBy, ...filterParams } = serialized;

    const first = await queryClient.fetchQuery<EntityCoreResponse<ICircuit>>({
      queryKey: keyBuilder.manyCircuits({
        ...filterParams,
        ...circuitScaleFilter,
        page: 1,
        page_size: DEFAULT_PAGE_SIZE,
        virtualLabId,
        projectId,
      }),
      queryFn: () =>
        getCircuits({
          withFacets: false,
          context: workspace,
          filters: {
            ...circuitScaleFilter,
            ...filterParams,
            page: 1,
            page_size: DEFAULT_PAGE_SIZE,
          },
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
          queryKey: keyBuilder.manyCircuits({
            ...filterParams,
            ...circuitScaleFilter,
            page,
            page_size: DEFAULT_PAGE_SIZE,
            virtualLabId,
            projectId,
          }),
          queryFn: () =>
            getCircuits({
              withFacets: false,
              context: workspace,
              filters: {
                ...circuitScaleFilter,
                ...filterParams,
                page,
                page_size: DEFAULT_PAGE_SIZE,
              },
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

    // Reuse the pure tree-builder unchanged. Roots (with `sub_circuits`) are the rows;
    // a single page → `GridPagination` auto-hides for the (small) top-level root set.
    const roots = buildFilteredHierarchyTree(
      tree,
      fullResult,
      filteredResult
    ) as unknown as ICircuit[];
    return { rows: roots, total: roots.length };
  }

  return {
    async fetch(query: GridQuery, signal?: AbortSignal): Promise<GridPage<ICircuit>> {
      const view = query.params?.[CIRCUIT_VIEW_PARAM];
      if (view === CircuitRepresentationView.Hierarchy) {
        return fetchHierarchy(query);
      }
      // flat: strip the view marker, then delegate to the shared paged source.
      return flatSource.fetch({ ...query, params: withoutViewParam(query.params) }, signal);
    },
  };
}
