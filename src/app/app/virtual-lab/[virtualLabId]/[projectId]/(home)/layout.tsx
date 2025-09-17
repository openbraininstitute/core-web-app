import { type ReactNode } from 'react';

import { ProjectInnerLayout } from '@/ui/layouts/project-inner-layout';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { LeftMenu } from '@/ui/segments/project/left-nav-menu';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { getQueryClient } from '@/query-provider/server';

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: keyBuilder.roles(),
    queryFn: getUserGroups,
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
