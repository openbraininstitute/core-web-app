'use client';

import { type ReactNode } from 'react';

import { useDisableWorkspaceOverflow } from '@/ui/hooks/use-disable-workspace-overflow';
import { ProjectInnerLayout } from '@/ui/layouts/project-inner-layout';
import { LeftMenu } from '@/ui/segments/project/left-nav-menu';

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  useDisableWorkspaceOverflow();
  return (
    <ProjectInnerLayout>
      <div id="project-left-menu" className="w-full px-3 [grid-area:aside]">
        <LeftMenu className="w-full" />
      </div>
      <div
        id="project-main-content"
        className="secondary-scrollbar w-full overflow-y-auto px-3 [grid-area:main]"
      >
        {children}
      </div>
    </ProjectInnerLayout>
  );
}
