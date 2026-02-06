import { useQuery } from '@tanstack/react-query';

import {
  getBrainAtlases,
  getBrainAtlasRegions,
} from '@/api/entitycore/queries/general/brain-atlas';
import { AppSpeciesBrainRegionConfig } from '@/features/brain-region-hierarchy/context';
import { keyBuilderAtlas } from '@/ui/use-query-keys/atlas';

export const useBrainAtlasQuery = (
  id: string = AppSpeciesBrainRegionConfig.Common.DefaultAtlasId
) => {
  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilderAtlas.defaultBrainAtlas(),
    queryFn: () =>
      getBrainAtlases({
        filters: { id },
      }),
  });
  return { atlas: data?.data.at(0), error: isError, loadingAtlas: isLoading };
};

export const useBrainRegionAtlasQuery = ({ id }: { id: string }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: keyBuilderAtlas.atlas({
      atlasId: id ?? AppSpeciesBrainRegionConfig.Common.DefaultAtlasId,
      page: 1,
      page_size: 1500,
    }),
    queryFn: () =>
      getBrainAtlasRegions({
        atlasId: id ?? AppSpeciesBrainRegionConfig.Common.DefaultAtlasId,
        filters: { page: 1, page_size: 1500 },
      }),
    enabled: !!id,
  });

  return {
    result: { atlas: data?.data },
    loadingAtlas: isLoading,
    error,
  };
};
