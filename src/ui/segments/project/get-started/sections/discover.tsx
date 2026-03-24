import { tryCatch } from '@/api/utils';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { EmptyTutorials, Grid } from '@/ui/segments/project/get-started/elements/discover';
import { DiscoverQuery, type TTutorial } from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

export async function DiscoverList() {
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: tutorials } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilderExternal.discoverTutorialsList(),
      queryFn: () => client.fetch<Array<TTutorial>>(DiscoverQuery),
    })
  );

  if (!tutorials?.length) {
    return <EmptyTutorials />;
  }

  return <Grid tutorials={tutorials} />;
}
