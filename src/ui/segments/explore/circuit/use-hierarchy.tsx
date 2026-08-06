/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { chunk, flatMap, get, isArray, keyBy, mergeWith, uniqBy } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import pMap from 'p-map';

import {
  getCircuitHierarchyByDerivation,
  getCircuits,
} from '@/api/entitycore/queries/model/circuit';
import {
  CIRCUIT_DERIVED_DERIVATION_TYPES,
  DerivationTypeDictionary,
} from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DEFAULT_PAGE_SIZE, WorkspaceScope } from '@/constants';
import { circuitScaleFilter } from '@/entity-configuration/domain/model/circuit';
import { speciesSelectionModeAtom } from '@/features/brain-region-hierarchy/context';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';
import { useQueryExtendedEntityType } from '@/ui/hooks/use-query-extended-entity-type';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  buildFilteredHierarchyTree,
  CircuitRepresentationView,
  collectIdsFromNode,
  filterAndEnrichTree,
  findNodeInTree,
  findParentInTree,
  getAllCircuitIds,
} from '@/ui/segments/explore/circuit/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { getWorkspaceScopeFilters } from '@/utils/workspace-scope';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TDerivationType } from '@/api/entitycore/types/entities/derivation';
import type { HierarchyTreeResponse } from '@/api/entitycore/types/shared/hierarchy';
import type {
  EntityCoreResponse,
  Pagination,
  TFacets,
} from '@/api/entitycore/types/shared/response';
import type { TWorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';
import type {
  HierarchyOutputNode,
  TCircuitRepresentationView,
} from '@/ui/segments/explore/circuit/helpers';

export function useFullRawHierarchy({
  view = CircuitRepresentationView.Flat,
}: {
  view: TCircuitRepresentationView | null;
}) {
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();
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
              withFacets: false,
              virtualLabId,
              projectId,
              // Keep the cache key in sync with the expanded fetch below.
              expand: 'generated_from_derivations',
              ...circuitScaleFilter,
            }),
            queryFn: () =>
              getCircuits({
                withFacets: false,
                context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
                // Enrich hierarchy rows with their incoming derivations so the "Derivation type"
                // column renders in the tree view too, matching the flat list (issue #517).
                expand: 'generated_from_derivations',
                filters: {
                  page: 1,
                  page_size: DEFAULT_PAGE_SIZE,
                  id__in: chunkIDs,
                  ...circuitScaleFilter,
                },
              }),
          }),
        { concurrency: 5 }
      );
      const allCircuits = flatMap(result, (r) => r.data);
      const allFacets = mergeWith(
        {},
        ...result.map((r) => r.facets || {}),
        (objValue: TFacets[], srcValue: TFacets[]) => {
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
    enabled: view === CircuitRepresentationView.Hierarchy,
    staleTime: Infinity,
    gcTime: 3_600_000, // 1 hour
  });

  return { circuitHierarchy, isLoadingFullHierarchy };
}

/**
 * Builds the react-query options for one circuit derivation hierarchy tree. Shared by
 * `useHierarchyDerivationTree` (single type) and `useHierarchyAllLevels` (`useQueries` over
 * many types), so the queryKey/queryFn live in exactly one place.
 */
function buildDerivationTreeQueryOptions({
  virtualLabId,
  projectId,
  view,
  derivationType,
}: WorkspaceContext & {
  view: TCircuitRepresentationView | null;
  derivationType: TDerivationType;
}) {
  return {
    queryKey: keyBuilder.circuitsByDerivationTree({ virtualLabId, projectId, derivationType }),
    queryFn: (): Promise<HierarchyTreeResponse> =>
      getCircuitHierarchyByDerivation({
        context: { virtualLabId, projectId },
        derivation_type: derivationType,
      }),
    enabled: view === CircuitRepresentationView.Hierarchy,
    staleTime: Infinity,
  };
}

export function useHierarchyDerivationTree({
  view,
  derivationType,
}: {
  view: TCircuitRepresentationView | null;
  derivationType: TDerivationType;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: hierarchyByDerivation, isLoading: loadingDerivation } =
    useQuery<HierarchyTreeResponse>(
      buildDerivationTreeQueryOptions({ virtualLabId, projectId, view, derivationType })
    );

  return {
    hierarchyByDerivation,
    loadingDerivation,
  };
}

export function useHierarchy({
  scope = WorkspaceScope.Public,
  view = CircuitRepresentationView.Flat,
  dataKey,
}: {
  scope: TWorkspaceScope | null;
  view: TCircuitRepresentationView | null;
  dataKey: string;
}) {
  const queryClient = useQueryClient();
  const { virtualLabId, projectId } = useWorkspace();
  const speciesSelectionMode = useAtomValue(speciesSelectionModeAtom);
  const isAllSpeciesMode = speciesSelectionMode === SpeciesSelectionMode.All;

  const { hierarchyByDerivation, loadingDerivation } = useHierarchyDerivationTree({
    view,
    derivationType: DerivationTypeDictionary.CircuitExtraction,
  });
  const { circuitHierarchy, isLoadingFullHierarchy } = useFullRawHierarchy({
    view,
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
      hierarchy: true,
    },
    workspace: { virtualLabId, projectId },
    queryFn: async ({ queryKey }) => {
      const [{ workspace, queryParameters }] = queryKey;
      const first = await queryClient.ensureQueryData<EntityCoreResponse<ICircuit>>({
        queryKey: keyBuilder.manyCircuits({
          ...circuitScaleFilter,
          ...queryParameters,
          ...workspace,
          page: 1,
          page_size: DEFAULT_PAGE_SIZE,
        }),
        queryFn: () =>
          getCircuits({
            withFacets: false,
            context: workspace,
            filters: {
              ...circuitScaleFilter,
              ...queryParameters,
              ...getWorkspaceScopeFilters(scope!, { virtualLabId, projectId }),
              page: 1,
              page_size: DEFAULT_PAGE_SIZE,
            },
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
                withFacets: false,
                context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
                filters: {
                  ...circuitScaleFilter,
                  ...queryParameters,
                  page,
                  page_size: DEFAULT_PAGE_SIZE,
                },
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
      if (view !== CircuitRepresentationView.Hierarchy) return false;

      if (isAllSpeciesMode) return true;

      return Boolean(get(queryParameters, 'within_brain_region_brain_region_id', null));
    },
  });

  if (hierarchyByDerivation && circuitHierarchy && circuitHierarchyFiltered) {
    const dataSource = buildFilteredHierarchyTree(
      hierarchyByDerivation,
      circuitHierarchy,
      circuitHierarchyFiltered
    ) as unknown as Array<HierarchyOutputNode>;
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

/** A single derivation source (parent) for the "Derived from" tab, with its derivation type. */
export interface DerivedFromGroup {
  derivationType: TDerivationType;
  circuit: ICircuit;
}

/** A group of derived circuits (subtree) for the "Derived circuits" tab, with its derivation type. */
export interface DerivedGroup {
  derivationType: TDerivationType;
  circuits: HierarchyOutputNode[];
}

export function useHierarchyAllLevels({ entityId }: WorkspaceContext & { entityId: string }) {
  const { virtualLabId, projectId } = useWorkspace();
  const { circuitHierarchy, isLoadingFullHierarchy } = useFullRawHierarchy({
    view: CircuitRepresentationView.Hierarchy,
  });
  const {
    hierarchyByDerivation: hierarchyByExtractionDerivation,
    loadingDerivation: loadingExtractionDerivation,
  } = useHierarchyDerivationTree({
    view: CircuitRepresentationView.Hierarchy,
    derivationType: DerivationTypeDictionary.CircuitExtraction,
  });

  const { derivedTrees, isLoadingDerived } = useQueries({
    queries: CIRCUIT_DERIVED_DERIVATION_TYPES.map((derivationType) =>
      buildDerivationTreeQueryOptions({
        virtualLabId,
        projectId,
        view: CircuitRepresentationView.Hierarchy,
        derivationType,
      })
    ),
    combine: (
      results
    ): {
      derivedTrees: Array<{
        derivationType: TDerivationType;
        tree: HierarchyTreeResponse | undefined;
      }>;
      isLoadingDerived: boolean;
    } => ({
      derivedTrees: results.map((result, index) => ({
        derivationType: CIRCUIT_DERIVED_DERIVATION_TYPES[index],
        tree: result.data,
      })),
      isLoadingDerived: results.some((result) => result.isLoading),
    }),
  });

  const allDerivedReady = derivedTrees.every(({ tree }) => Boolean(tree));

  if (circuitHierarchy && hierarchyByExtractionDerivation && allDerivedReady) {
    const fullById = keyBy(circuitHierarchy.data, 'id');
    const extractionParent = findParentInTree(hierarchyByExtractionDerivation.data, entityId);
    const extractionNode = findNodeInTree(hierarchyByExtractionDerivation.data, entityId);
    const subCircuits = extractionNode
      ? filterAndEnrichTree([extractionNode], new Set(collectIdsFromNode(extractionNode)), fullById)
      : [];
    const parent: ICircuit | undefined = extractionParent
      ? get(fullById, extractionParent.id)
      : undefined;

    const derivedFrom: DerivedFromGroup[] = [];
    const derived: DerivedGroup[] = [];

    for (const { derivationType, tree } of derivedTrees) {
      if (!tree) continue;

      const parentNode = findParentInTree(tree.data, entityId);
      if (parentNode) {
        const sourceCircuit: ICircuit | undefined = get(fullById, parentNode.id);
        if (sourceCircuit) derivedFrom.push({ derivationType, circuit: sourceCircuit });
      }

      const node = findNodeInTree(tree.data, entityId);
      const circuits = node
        ? filterAndEnrichTree([node], new Set(collectIdsFromNode(node)), fullById)
        : [];
      if (circuits.at(0)?.sub_circuits?.length) {
        derived.push({ derivationType, circuits });
      }
    }

    return {
      subCircuits,
      derived,
      parent,
      derivedFrom,
    };
  }

  return {
    subCircuits: [],
    derived: [] as DerivedGroup[],
    parent: undefined as ICircuit | undefined,
    derivedFrom: [] as DerivedFromGroup[],
    isLoading: isLoadingFullHierarchy || loadingExtractionDerivation || isLoadingDerived,
  };
}
