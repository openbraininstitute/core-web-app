import { config } from '@/config';
import { BackButton } from '@/ui/segments/project/get-started/elements/back-button';
import { TutorialList } from '@/ui/segments/project/get-started/sections/tutorials';

import type { PropsWithChildren } from 'react';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Layout({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext, null> & PropsWithChildren) {
  const context = await params;

  return (
    <section id="tutorials" data-testid="tutorials" className="pr-2">
      <BackButton
        className="sticky top-0 bg-background w-full z-100 pb-2"
        toBack={`${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}`}
        list={[
          {
            title: 'Get started',
            link: `${config.ROOT_ROUTE}/${context.virtualLabId}/${context.projectId}`,
          },
          { title: 'Tutorials', link: '' },
        ]}
      />
      {children}
      <TutorialList />
    </section>
  );
}
