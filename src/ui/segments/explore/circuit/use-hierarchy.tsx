/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import mergeWith from 'lodash/mergeWith';
import flatMap from 'lodash/flatMap';
import isArray from 'lodash/isArray';
import uniqBy from 'lodash/uniqBy';
import chunk from 'lodash/chunk';
import get from 'lodash/get';
import pMap from 'p-map';

import {
  buildFilteredHierarchyTree,
  HierarchyOutputNode,
} from '@/ui/segments/explore/circuit/context';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useQueryExtendedEntityType } from '@/ui/hooks/use-query-extended-entity-type';
import { CircuitView, getAllCircuitIds } from '@/ui/segments/explore/circuit/helpers';
import { DerivationTypeDictionary } from '@/api/entitycore/types/entities/derivation';
import { DEFAULT_PAGE_SIZE, WorkspaceScope } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import {
  getCircuitHierarchyByDerivation,
  getCircuits,
} from '@/api/entitycore/queries/model/circuit';

import type { HierarchyTreeResponse } from '@/api/entitycore/types/shared/hierarchy';
import type { TCircuitView } from '@/ui/segments/explore/circuit/helpers';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type {
  EntityCoreResponse,
  Facets,
  Pagination,
} from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';

export function useHierarchy({
  scope = WorkspaceScope.Public,
  view = CircuitView.Flat,
  dataKey,
}: {
  scope: TWorkspaceScope | null;
  view: TCircuitView | null;
  dataKey: string;
}) {
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();

  const { data: hierarchyByDerivation, isLoading: loadingDerivation } =
    useQuery<HierarchyTreeResponse>({
      queryKey: keyBuilder.circuitsByDerivationTree({
        virtualLabId,
        projectId,
        derivationType: DerivationTypeDictionary.CircuitExtraction,
      }),
      queryFn: () =>
        getCircuitHierarchyByDerivation({
          context: { virtualLabId, projectId },
          derivation_type: DerivationTypeDictionary.CircuitExtraction,
        }),
      enabled: view === CircuitView.Hierarchy,
      staleTime: Infinity,
    });

  const { data: circuitHierarchy, isLoading: isLoadingFullHierarchy } = useQuery({
    queryKey: keyBuilder.fullCircuitHierarchy({ virtualLabId, projectId }),
    queryFn: async () => {
      const hierarchyByDerivationData = await queryClient.ensureQueryData<HierarchyTreeResponse>({
        queryKey: keyBuilder.circuitsByDerivationTree({
          virtualLabId,
          projectId,
          derivationType: DerivationTypeDictionary.CircuitExtraction,
        }),
        queryFn: () =>
          getCircuitHierarchyByDerivation({
            context: { virtualLabId, projectId },
            derivation_type: DerivationTypeDictionary.CircuitExtraction,
          }),
      });
      const IDs = getAllCircuitIds(hierarchyByDerivationData);
      const chunks = chunk(IDs, 30);
      const result = await pMap(
        chunks,
        (chunkIDs) =>
          queryClient.ensureQueryData<EntityCoreResponse<ICircuit>>({
            queryKey: keyBuilder.manyCircuits({
              page: 1,
              page_size: DEFAULT_PAGE_SIZE,
              id__id: chunkIDs,
              withFacets: true,
              virtualLabId,
              projectId,
            }),
            queryFn: () =>
              getCircuits({
                withFacets: true,
                context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
                filters: { page: 1, page_size: DEFAULT_PAGE_SIZE, id__in: chunkIDs },
              }),
          }),
        { concurrency: 5 }
      );
      const allCircuits = flatMap(result, (r) => r.data);
      const allFacets = mergeWith(
        {},
        ...result.map((r) => r.facets || {}),
        (objValue: Facets[], srcValue: Facets[]) => {
          if (isArray(objValue)) {
            return uniqBy([...objValue, ...srcValue], 'id');
          }
          return undefined; // default merge for non-arrays
        }
      );
      const totalPageSize = result.reduce((sum, r) => sum + r.pagination.page_size, 0);

      return {
        data: allCircuits,
        facets: allFacets,
        pagination: {
          page: 1,
          page_size: DEFAULT_PAGE_SIZE,
          total_items: totalPageSize,
        },
      };
    },
    enabled: view === CircuitView.Hierarchy,
    staleTime: Infinity,
    gcTime: 3_600_000, // 1 hour
  });

  const {
    data: circuitHierarchyFiltered,
    isFetching: isFetchingFilteredHierarchy,
    isPending: isPendingFilteredHierarchy,
    queryKeyHash,
  } = useQueryExtendedEntityType({
    context: {
      key: dataKey,
      workspaceScope: scope!,
      extendedEntityType: ExtendedEntitiesTypeDict.Circuit,
    },
    workspace: { virtualLabId, projectId },
    queryFn: async ({ queryKey }) => {
      const [{ workspace, queryParameters }] = queryKey;
      const first = await queryClient.ensureQueryData<EntityCoreResponse<ICircuit>>({
        queryKey: keyBuilder.manyCircuits({
          ...queryParameters,
          ...workspace,
          page: 1,
          page_size: DEFAULT_PAGE_SIZE,
        }),
        queryFn: () =>
          getCircuits({
            withFacets: true,
            context: workspace,
            filters: { ...queryParameters, page: 1, page_size: DEFAULT_PAGE_SIZE },
          }),
      });
      const totalPages = Math.ceil(first.pagination.total_items / first.pagination.page_size);
      const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

      const responses = await pMap(
        pages,
        (page) =>
          queryClient.ensureQueryData<EntityCoreResponse<ICircuit>>({
            queryKey: keyBuilder.manyCircuits({
              ...queryParameters,
              page,
              virtualLabId,
              projectId,
              page_size: DEFAULT_PAGE_SIZE,
            }),
            queryFn: () =>
              getCircuits({
                withFacets: true,
                context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
                filters: { ...queryParameters, page, page_size: DEFAULT_PAGE_SIZE },
              }),
          }),
        { concurrency: 5 }
      );
      const allData = flatMap(responses, (r) => r.data);
      return {
        data: allData.map((p) => ({ ...p, isFiltered: true })),
        facets: undefined,
        pagination: {
          total_items: allData.length,
          page: 1,
          page_size: allData.length,
        } as Pagination,
      };
    },
    requireBrainRegion: true,
    useKeepPreviousData: false,
    enabled: ({ queryKey }) => {
      const [{ queryParameters }] = queryKey;
      if (
        get(queryParameters, 'within_brain_region_brain_region_id', null) &&
        view === CircuitView.Hierarchy
      )
        return true;
      return false;
    },
  });

  if (hierarchyByDerivation && circuitHierarchy && circuitHierarchyFiltered) {
    const dataSource = buildFilteredHierarchyTree(
      hierarchyByDerivation,
      circuitHierarchy,
      circuitHierarchyFiltered
    ) as unknown as HierarchyOutputNode[];
    const { pagination, facets } = circuitHierarchy;
    return {
      queryKeyHash,
      dataSource,
      pagination,
      facets,
    };
  }

  const isLoading =
    loadingDerivation ||
    isFetchingFilteredHierarchy ||
    isPendingFilteredHierarchy ||
    isLoadingFullHierarchy;

  return {
    isLoading,
    queryKeyHash,
    dataSource: [],
    pagination: undefined,
    facets: {},
  };
}
