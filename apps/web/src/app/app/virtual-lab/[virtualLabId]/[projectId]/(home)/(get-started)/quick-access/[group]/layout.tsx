import { config } from '@/config';
import { BackButton } from '@/ui/segments/project/get-started/elements/back-button';
import { GroupDropdown } from '@/ui/segments/project/get-started/elements/quick-access';

import type { PropsWithChildren } from 'react';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Layout({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext & { group: string }, null> & PropsWithChildren) {
  const { group, ...context } = await params;
  return (
    <section id="quick-access" className="pr-2">
      <BackButton
        className="sticky top-0 bg-background w-full z-49 pb-2"
        toBack={`${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}`}
        list={[
          {
            title: 'Get started',
            link: `${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}`,
          },
          { title: 'Quick access', link: null },
          { title: group, link: null, customRenderer: <GroupDropdown /> },
        ]}
      />
      {children}
    </section>
  );
}
