import { queryOptions } from '@tanstack/react-query';

import { getBrainAtlasRegions } from '@/api/entitycore/queries/general/brain-atlas';
import { keyBuilderAtlas } from '@/ui/use-query-keys/atlas';
import { DEFAULT_PAGE_SIZE, fetchAllPaginatedData } from '@/utils/pagination';

import type { QueryClient } from '@tanstack/react-query';
import type { IBrainAtlasRegion } from '@/api/entitycore/types/entities/brain-atlas';

export type BrainRegionAtlasQueryData = {
  data: IBrainAtlasRegion[];
};

export function brainRegionAtlasQueryOptions(atlasId: string) {
  return queryOptions<BrainRegionAtlasQueryData>({
    queryKey: keyBuilderAtlas.atlas({ atlasId }),
    queryFn: async () => {
      const atlasData = await fetchAllPaginatedData({
        fn: async (page: number, pageSize: number) => {
          const result = await getBrainAtlasRegions({
            atlasId,
            filters: { page, page_size: pageSize },
          });
          return { data: result.data || [] };
        },
        pageSize: DEFAULT_PAGE_SIZE,
      });

      return { data: atlasData };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export async function ensureBrainRegionAtlasData(queryClient: QueryClient, atlasId: string) {
  if (!atlasId) {
    return { data: [] };
  }

  return queryClient.ensureQueryData(brainRegionAtlasQueryOptions(atlasId));
}

function brainAtlasRegionEntryQueryOptions(atlasId: string, brainRegionId: string) {
  return queryOptions<IBrainAtlasRegion | null>({
    queryKey: keyBuilderAtlas.regionEntry({ atlasId, brainRegionId }),
    queryFn: async () => {
      const result = await getBrainAtlasRegions({
        atlasId,
        filters: { brain_region_id: brainRegionId, page_size: 1 },
      });
      return result.data?.[0] ?? null;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/**
 * Resolves the atlas entry of a single brain region. Reuses the full atlas when it is already
 * loaded, otherwise asks the API for that region only instead of paginating the whole atlas.
 */
export async function ensureBrainAtlasRegionEntry(
  queryClient: QueryClient,
  atlasId: string,
  brainRegionId: string
): Promise<IBrainAtlasRegion | null> {
  const fullAtlas = queryClient.getQueryData(brainRegionAtlasQueryOptions(atlasId).queryKey);
  if (fullAtlas) {
    return fullAtlas.data.find((entry) => entry.brain_region_id === brainRegionId) ?? null;
  }

  return queryClient.ensureQueryData(brainAtlasRegionEntryQueryOptions(atlasId, brainRegionId));
}
