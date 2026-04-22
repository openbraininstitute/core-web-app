import { getAboutContent } from '@/services/sanity/api/get-about-content';
import { getGuidesContent } from '@/services/sanity/api/get-guides-content';
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
  const [aboutContent, guidesContent] = await Promise.all([getAboutContent(), getGuidesContent()]);

  return (
    <section
      id="tutorials"
      data-testid="tutorials"
      className="flex h-full w-full items-start gap-8 pb-4"
    >
      <div className="flex max-h-full w-[40%] min-w-0 flex-col gap-3 overflow-y-auto rounded-xl border-2 border-[#e9e9e9] bg-transparent p-3">
        <HelpButtonsRow />
        <TutorialList />
        <QuickAccessExamples context={context} />
      </div>
      <div className="w-[60%] min-w-0">
        <TutorialLeftPane aboutContent={aboutContent} guidesContent={guidesContent}>
          {children}
        </TutorialLeftPane>
      </div>
    </section>
  );
}
