import { RedirectType, redirect } from 'next/navigation';

import { tryCatch } from '@/api/utils';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { config } from '@/config';
import { getQueryClient } from '@/query-provider/server';
import { ProjectInnerLayout } from '@/ui/layouts/project-inner-layout';
import { LeftMenu } from '@/ui/segments/project/left-nav-menu';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { PropsWithChildren } from 'react';
import type { ServerSideComponentProp } from '@/types/common';

export default async function Layout({
  params: promisedParams,
  children,
}: ServerSideComponentProp<{ virtualLabId: string; projectId: string }, null> & PropsWithChildren) {
  const { virtualLabId, projectId } = await promisedParams;
  const queryClient = getQueryClient();

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
