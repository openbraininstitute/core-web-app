'use client';

import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getBrainAtlases } from '@/api/entitycore/queries/general/brain-atlas';
import { getBrainRegionHierarchiesWithSpecies } from '@/api/entitycore/queries/general/brain-region';
import { getWorkspaceHierarchySpeciesPreference } from '@/api/virtual-lab-svc/queries/user';
import { config } from '@/config';
import { transformSpecies } from '@/features/brain-region-hierarchy/helpers';
import { SPECIES_TAXONOMY_IDS } from '@/features/brain-region-hierarchy/types';
import { keyBuilderAtlas, keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';

import type { IBrainAtlas } from '@/api/entitycore/types/entities/brain-atlas';
import type { IBrainRegionHierarchiesResponse } from '@/api/entitycore/types/entities/brain-region-hierarchy';
import type { IHierarchyWithSpecies } from '@/features/brain-region-hierarchy/types';

const {
  HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID,
  MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID,
  RAT_DEFAULT__SELECTED_BRAIN_REGION_ID,
} = config;

/**
 * transform api response to HierarchyWithSpecies array with display names
 */
function transformHierarchiesResponse(response: IBrainRegionHierarchiesResponse) {
  if (!response?.data) return [];

  const result = response.data
    .filter((hierarchy) => !config.EXCLUDED_HIERARCHY_IDS.includes(hierarchy.id))
    .map((hierarchy) => ({
      id: hierarchy.id,
      name: hierarchy.name,
      species: transformSpecies(hierarchy.id, hierarchy.species),
    }));

  return result;
}

function mapAtlasByHierarchy(atlases: IBrainAtlas[] | undefined) {
  const atlasByHierarchyId = new Map<string, string>();
  for (const atlas of atlases ?? []) {
    atlasByHierarchyId.set(atlas.hierarchy_id, atlas.id);
  }
  return atlasByHierarchyId;
}

function getFallbackDefaultBrainRegionId(taxonomyId: string) {
  if (taxonomyId === SPECIES_TAXONOMY_IDS.HOMO_SAPIENS) {
    return HUMAN_DEFAULT__SELECTED_BRAIN_REGION_ID;
  }
  if (taxonomyId === SPECIES_TAXONOMY_IDS.RATTUS_NORVEGICUS) {
    return RAT_DEFAULT__SELECTED_BRAIN_REGION_ID;
  }
  return MOUSE_DEFAULT__SELECTED_BRAIN_REGION_ID;
}

/**
 * fetching available species and their brain region hierarchies
 *
 * automatic caching infinitely, 30 min garbage collection)
 *
 * @return list of all available species/hierarchy combinations
 */
export function useAvailableHierarchySpeciesQuery() {
  const query = useQuery({
    queryKey: keyBuilderHierarchy.hierarchies(),
    queryFn: async () => {
      return await getBrainRegionHierarchiesWithSpecies();
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    select: (response) => transformHierarchiesResponse(response),
  });

  return {
    remoteAvailableHierarchies: query.data,
    loading: query.isPending,
    error: query.error,
  };
}

export function useHierarchyRuntimeMetadataQuery() {
  const {
    remoteAvailableHierarchies,
    loading: loadingHierarchies,
    error: hierarchyError,
  } = useAvailableHierarchySpeciesQuery();
  const {
    data: atlasData,
    isPending: loadingAtlases,
    error: atlasError,
  } = useQuery({
    queryKey: keyBuilderAtlas.all(),
    queryFn: () => getBrainAtlases({}),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const atlasByHierarchyId = useMemo(() => mapAtlasByHierarchy(atlasData?.data), [atlasData?.data]);
  const runtimeHierarchies: Array<
    IHierarchyWithSpecies & {
      atlasId?: string;
      fallbackDefaultSelectedRegionId: string;
    }
  > = useMemo(
    () =>
      (remoteAvailableHierarchies ?? []).map((hierarchy) => {
        return {
          ...hierarchy,
          atlasId: atlasByHierarchyId.get(hierarchy.id),
          fallbackDefaultSelectedRegionId: getFallbackDefaultBrainRegionId(
            hierarchy.species.taxonomyId
          ),
        };
      }),
    [atlasByHierarchyId, remoteAvailableHierarchies]
  );

  const runtimeHierarchyById = useMemo(
    () => new Map(runtimeHierarchies.map((hierarchy) => [hierarchy.id, hierarchy])),
    [runtimeHierarchies]
  );

  return {
    runtimeHierarchies,
    runtimeHierarchyById,
    loading: loadingHierarchies || loadingAtlases,
    error: hierarchyError ?? atlasError,
  };
}

export function useRemoteUserPreferenceHierarchySpeciesQuery() {
  const {
    data,
    isPending: isLoadingRemotePreference,
    error,
  } = useQuery({
    queryKey: keyBuilderHierarchy.hierarchyPreference(),
    queryFn: () => getWorkspaceHierarchySpeciesPreference(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  return {
    remoteUserPreferenceHierarchySpecies: data?.data?.preference,
    loading: isLoadingRemotePreference,
    error,
  };
}

/**
 * parallel bootstrap queries for hierarchy list + user preference.
 */
export function useBrainRegionBootstrapQueries() {
  return useQueries({
    queries: [
      {
        queryKey: keyBuilderHierarchy.hierarchies(),
        queryFn: async () => getBrainRegionHierarchiesWithSpecies(),
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
        select: (response: IBrainRegionHierarchiesResponse) =>
          transformHierarchiesResponse(response),
      },
      {
        queryKey: keyBuilderHierarchy.hierarchyPreference(),
        queryFn: () => getWorkspaceHierarchySpeciesPreference(),
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
      },
    ],
    combine: ([hierarchies, preference]) => ({
      isLoading: hierarchies.isPending || preference.isPending,
      error: hierarchies.error ?? preference.error ?? null,
      remoteAvailableHierarchies: hierarchies.data,
      remoteUserPreferenceHierarchySpecies: preference.data?.data?.preference,
    }),
  });
}
