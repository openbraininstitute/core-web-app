import { useQuery } from '@tanstack/react-query';

import { getBrainAtlases } from '@/api/entitycore/queries/general/brain-atlas';
import { brainRegionAtlasQueryOptions } from '@/features/brain-atlas-viewer/queries';
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
    ...brainRegionAtlasQueryOptions(id ?? ''),
    enabled: !!id,
  });

  return {
    result: { atlas: data?.data },
    loadingAtlas: isLoading,
    error,
  };
};
