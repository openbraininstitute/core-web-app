'use client';

import type { ReactNode } from 'react';

import { ProjectInnerLayout } from '@/ui/layouts/project-inner-layout';
import { LeftMenu } from '@/ui/segments/project/left-nav-menu';

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <ProjectInnerLayout>
      <div className="w-full p-3 [grid-area:aside]">
        <LeftMenu className="w-full" />
      </div>
      <div id="body" className="secondary-scrollbar w-full overflow-y-auto [grid-area:main]">
        {children}
      </div>
    </ProjectInnerLayout>
  );
}
