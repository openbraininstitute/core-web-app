import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import {
  ProjectHomeGetStartedQuery,
  type TProjectHomeData,
  type TTutorial,
  TutorialQuery,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

import type { PropsWithChildren } from 'react';

/** The project's start page: full width, without the left menu of the other home pages. */
export default function Layout({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();
  const client = getClient();

  queryClient.prefetchQuery({
    queryKey: keyBuilderExternal.discoverTutorialsList(),
    queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery, {}, { next: { revalidate: 0 } }),
  });

  queryClient.prefetchQuery({
    queryKey: keyBuilderExternal.projectHomeGetStarted(),
    queryFn: () =>
      client.fetch<TProjectHomeData>(ProjectHomeGetStartedQuery, {}, { next: { revalidate: 0 } }),
  });

  return children;
}
