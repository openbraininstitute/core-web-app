import { getAboutContent } from '@/services/sanity/api/get-about-content';
import { HelpButtonsRow } from '@/ui/segments/project/get-started/elements/help-buttons-row';
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
  const aboutContent = await getAboutContent();

  return (
    <section id="tutorials" data-testid="tutorials" className="flex w-full gap-8">
      <div className="w-[60%] min-w-0">
        <TutorialLeftPane aboutContent={aboutContent}>{children}</TutorialLeftPane>
      </div>
      <div className="flex w-[40%] min-w-0 flex-col gap-6 rounded-xl bg-[#e9e9e9] p-3">
        <TutorialList />
        <QuickAccessExamples context={context} />
        <HelpButtonsRow />
      </div>
    </section>
  );
}
