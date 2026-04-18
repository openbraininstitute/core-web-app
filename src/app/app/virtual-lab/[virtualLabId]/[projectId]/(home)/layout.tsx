import { RedirectType, redirect } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { config } from '@/config';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import {
  getQuickAccessQuery,
  type IQuickAccessList,
  type TTutorial,
  TutorialQuery,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { PropsWithChildren } from 'react';
import type { ServerSideComponentProp } from '@/types/common';

export default async function Layout({
  params: promisedParams,
  children,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null> & PropsWithChildren) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();
  const client = getClient();
  queryClient.prefetchQuery({
    queryKey: keyBuilder.membership(),
    queryFn: getUserGroups,
  });

  const { data, error } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
      queryFn: () => getProject({ virtualLabId, projectId }),
    })
  );

  if (!data || error) {
    redirect(`${config.ROOT_ROUTE}/sync`, RedirectType.replace);
  }

  queryClient.prefetchQuery({
    queryKey: keyBuilderExternal.discoverTutorialsList(),
    queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery, {}, { next: { revalidate: 0 } }),
  });

  queryClient.prefetchQuery({
    queryKey: keyBuilderExternal.quickAccessList(),
    queryFn: () =>
      client.fetch<Array<IQuickAccessList>>(getQuickAccessQuery(), {}, { next: { revalidate: 0 } }),
  });

  return (
    <div className="bg-background h-full w-full overflow-hidden">
      <div id="project-main-content" className="h-full w-full overflow-hidden px-3">
        {children}
      </div>
    </div>
  );
}
