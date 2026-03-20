import { flatMap, times } from 'es-toolkit/compat';

import { tryCatch } from '@/api/utils';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { Grid } from '@/ui/segments/project/get-started/elements/discover';
import {
  DiscoverQuery,
  type IDiscoverTutorialsList,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

export async function DiscoverList() {
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: discoverTutorialsList } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilderExternal.discoverTutorialsList(),
      queryFn: () => client.fetch<IDiscoverTutorialsList>(DiscoverQuery),
    })
  );
  const tutorials = discoverTutorialsList?.tutorialOrder ?? [];

  return <Grid tutorials={tutorials} />;
}
