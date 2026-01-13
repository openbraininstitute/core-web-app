'use client';

import { useQuery } from '@tanstack/react-query';
import { getBrainRegionHierarchiesWithSpecies } from '@/api/entitycore/queries/general/brain-region';
import type { IBrainRegionHierarchiesResponse } from '@/api/entitycore/types/entities/brain-region-hierarchy';
import { getWorkspaceHierarchySpeciesPreference } from '@/api/virtual-lab-svc/queries/user';
import { transformSpecies } from '@/features/brain-region-hierarchy/types';
import { keyBuilderHierarchy } from '@/ui/use-query-keys/atlas';

/**
 * Transform API response to HierarchyWithSpecies array with display names
 */
function transformHierarchiesResponse(response: IBrainRegionHierarchiesResponse) {
  if (!response?.data) return [];

  const result = response.data.map((hierarchy) => ({
    id: hierarchy.id,
    name: hierarchy.name,
    species: transformSpecies(hierarchy.id, hierarchy.species),
  }));

  return result;
}

/**
 * fetching available species and their brain region hierarchies
 *
 * this hook provides:
 * - List of all available species/hierarchy combinations
 * - Automatic caching infinitely, 30 min garbage collection)
 * - Loading and error states
 */
export function useAvailableHierarchySpeciesQuery() {
  const query = useQuery({
    queryKey: keyBuilderHierarchy.hierarchies(),
    queryFn: async () => {
      return await getBrainRegionHierarchiesWithSpecies();
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    select: (response) => transformHierarchiesResponse(response),
  });

  return {
    remoteAvailableHierarchies: query.data,
    loading: query.isLoading,
    error: query.error,
  };
}

export function useRemoteUserPreferenceHierarchySpeciesQuery() {
  const {
    data,
    isLoading: isLoadingRemotePreference,
    error,
  } = useQuery({
    queryKey: keyBuilderHierarchy.hierarchyPreference(),
    queryFn: () => getWorkspaceHierarchySpeciesPreference(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    remoteUserPreferenceHierarchySpecies: data?.data?.preference,
    loading: isLoadingRemotePreference,
    error,
  };
}
