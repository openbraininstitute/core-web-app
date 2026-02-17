import { useQuery } from '@tanstack/react-query';

import {
  getBrainAtlases,
  getBrainAtlasRegions,
} from '@/api/entitycore/queries/general/brain-atlas';
import { keyBuilderAtlas } from '@/ui/use-query-keys/atlas';

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
      page: 1,
      page_size: 1500,
    }),
    queryFn: () =>
      getBrainAtlasRegions({
        atlasId: id ?? '',
        filters: { page: 1, page_size: 1500 },
      }),
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
