import { getAboutContent } from '@/services/sanity/api/get-about-content';
import { getGuidesContent } from '@/services/sanity/api/get-guides-content';
import { HelpButtonsRow } from '@/ui/segments/project/get-started/elements/help-buttons-row';
import { TutorialLeftPane } from '@/ui/segments/project/get-started/elements/tutorial-left-pane';
import { TutorialsColumns } from '@/ui/segments/project/get-started/elements/tutorials-columns';
import { TutorialsExamplesPanel } from '@/ui/segments/project/get-started/elements/tutorials-examples-panel';
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
    <TutorialsColumns
      left={
        <>
          <div className="rounded-xl bg-[#ededed] p-3">
            <HelpButtonsRow />
          </div>
          <TutorialsExamplesPanel>
            <div className="flex flex-col gap-3">
              <TutorialList />
              <QuickAccessExamples context={context} />
            </div>
          </TutorialsExamplesPanel>
        </>
      }
      right={
        <TutorialLeftPane aboutContent={aboutContent} guidesContent={guidesContent}>
          {children}
        </TutorialLeftPane>
      }
    />
  );
}
