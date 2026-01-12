"use client";

import { useQuery } from "@tanstack/react-query";

import { getBrainRegionHierarchiesWithSpecies } from "@/api/entitycore/queries/general/brain-region";
import { transformSpecies } from "@/features/brain-region-hierarchy/types";
import { keyBuilderHierarchy } from "@/ui/use-query-keys/atlas";

import type { IBrainRegionHierarchiesResponse } from "@/api/entitycore/types/entities/brain-region-hierarchy";
import type { HierarchyWithSpecies } from "@/features/brain-region-hierarchy/types";
import { getBrainRegionPreference } from "@/api/virtual-lab-svc/queries/brain-region-preferences";

/**
 * Transform API response to HierarchyWithSpecies array with display names
 */
function transformHierarchiesResponse(
  response: IBrainRegionHierarchiesResponse,
) {
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
export function useBrainRegionHierarchySpeciesQuery() {
  const query = useQuery({
    queryKey: keyBuilderHierarchy.hierarchies(),
    queryFn: async () => {
      return await getBrainRegionHierarchiesWithSpecies();
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    select: (response) => transformHierarchiesResponse(response),
  });

  console.log("——", { d: query.data });
  return {
    hierarchies: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * get the species info for a given hierarchy id
 *
 * @param hierarchyId - the hierarchy id
 * @returns the species info or null if not found
 */
export function useSpeciesForHierarchy(hierarchyId: string | null) {
  const { hierarchies } = useBrainRegionHierarchySpeciesQuery();

  if (!hierarchyId || hierarchies?.length === 0) return null;

  return hierarchies?.find((h) => h.id === hierarchyId)?.species ?? null;
}

export function useRemoteHierarchyUserPreferenceQuery() {
  const {
    data,
    isLoading: isLoadingRemotePreference,
    error,
  } = useQuery({
    queryKey: keyBuilderHierarchy.hierarchyPreference(),
    queryFn: () => getBrainRegionPreference(),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  return {
    remoteHierarchyPreference: data?.data?.preference,
    loading: isLoadingRemotePreference,
    error,
  };
}
