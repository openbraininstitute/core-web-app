import { useQuery } from '@tanstack/react-query';

import {
  getBrainAtlases,
  getBrainAtlasRegions,
} from '@/api/entitycore/queries/general/brain-atlas';
import { keyBuilderAtlas } from '@/ui/use-query-keys/atlas';
import { fetchAllPaginatedData } from '@/utils/pagination';

export const useBrainAtlasQuery = (id?: string) => {
  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilderAtlas.byId(id ?? ''),
    queryFn: () =>
      getBrainAtlases({
        filters: { id },
      }),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return { atlas: data?.data.at(0), error: isError, loadingAtlas: isLoading };
};

export const useBrainRegionAtlasQuery = ({ id }: { id?: string }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: keyBuilderAtlas.atlas({
      atlasId: id ?? '',
    }),
    queryFn: async () => {
      const atlasData = await fetchAllPaginatedData({
        fn: async (page: number, pageSize: number) => {
          const result = await getBrainAtlasRegions({
            atlasId: id ?? '',
            filters: { page, page_size: pageSize },
          });
          return { data: result.data || [] };
        },
        pageSize: 200,
      });
      return { data: atlasData };
    },
    enabled: !!id,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    result: { atlas: data?.data },
    loadingAtlas: isLoading,
    error,
  };
};
