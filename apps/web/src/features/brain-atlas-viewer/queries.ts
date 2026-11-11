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
