import { TutorialLeftPane } from '@/ui/segments/project/get-started/elements/tutorial-left-pane';
import { QuickAccessExamples } from '@/ui/segments/project/get-started/sections/quick-access-examples';
import { TutorialList } from '@/ui/segments/project/get-started/sections/tutorials';

import type { PropsWithChildren } from 'react';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Layout({
  children,
  params,
}: ServerSideComponentProp<WorkspaceContext, null> & PropsWithChildren) {
  const context = await params;

  return (
    <section id="tutorials" data-testid="tutorials" className="flex w-full gap-4 pr-2">
      <div className="w-[55%] min-w-0">
        <TutorialLeftPane>{children}</TutorialLeftPane>
      </div>
      <div className="flex w-[45%] min-w-0 flex-col gap-6">
        <TutorialList />
        <QuickAccessExamples context={context} />
      </div>
    </section>
  );
}
