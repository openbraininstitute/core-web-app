'use client';

import { ProjectInnerLayout } from '@/ui/layouts/project-inner-layout';
import { GetStartedCards } from '@/ui/segments/project/get-started/sections/get-started-cards';
import { LeftMenu } from '@/ui/segments/project/left-nav-menu';

/** The project home as main has it: the project's menu on the left, and its get-started cards. */
export function OriginalHomePage() {
  return (
    <ProjectInnerLayout>
      <div
        id="project-left-menu"
        data-testid="project-left-menu"
        className="w-full pl-3 [grid-area:aside]"
      >
        <LeftMenu className="w-full" />
      </div>
      <div
        id="project-main-content"
        data-testid="project-main-content"
        className="secondary-scrollbar w-full overflow-y-auto [grid-area:main]"
      >
        <div className="flex w-full flex-col gap-4 pr-2">
          <GetStartedCards />
        </div>
      </div>
    </ProjectInnerLayout>
  );
}
