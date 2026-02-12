import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { getQueryClient } from '@/query-provider/server';
import { ProjectInnerLayout } from '@/ui/layouts/project-inner-layout';
import { LeftMenu } from '@/ui/segments/project/left-nav-menu';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: keyBuilder.membership(),
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
