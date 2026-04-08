import { tryCatch } from '@/api/utils';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { EmptyTutorials, TutorialGrid } from '@/ui/segments/project/get-started/elements/tutorial';
import { type TTutorial, TutorialQuery } from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

export async function TutorialList() {
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: tutorials } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilderExternal.discoverTutorialsList(),
      queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery),
    })
  );

  if (!tutorials?.length) {
    return <EmptyTutorials />;
  }

  return <TutorialGrid tutorials={tutorials} />;
}
