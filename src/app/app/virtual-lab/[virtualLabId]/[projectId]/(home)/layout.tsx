import { RedirectType, redirect } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { config } from '@/config';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { ProjectInnerLayout } from '@/ui/layouts/project-inner-layout';
import {
  DiscoverQuery,
  getQuickAccessQuery,
  type IDiscoverTutorialsList,
  type IQuickAccessList,
} from '@/ui/segments/project/get-started/query';
import { LeftMenu } from '@/ui/segments/project/left-nav-menu';
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
    queryFn: () => client.fetch<IDiscoverTutorialsList>(DiscoverQuery),
  });

  queryClient.prefetchQuery({
    queryKey: keyBuilderExternal.quickAccessList(),
    queryFn: () => client.fetch<Array<IQuickAccessList>>(getQuickAccessQuery()),
  });

  return (
    <ProjectInnerLayout>
      <div id="project-left-menu" className="w-full pl-3 [grid-area:aside]">
        <LeftMenu className="w-full" />
      </div>
      <div
        id="project-main-content"
        className="secondary-scrollbar w-full overflow-y-auto [grid-area:main]"
      >
        {children}
      </div>
    </ProjectInnerLayout>
  );
}
