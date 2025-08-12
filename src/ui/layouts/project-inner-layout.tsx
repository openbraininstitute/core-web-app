'use client';

import type { ReactNode } from 'react';
import { useDisableWorkspaceOverflow } from '@/ui/hooks/use-disable-workspace-overflow';

type Props = {
  children: ReactNode;
};

export function ProjectInnerLayout({ children }: Props) {
  useDisableWorkspaceOverflow();

  return (
    <div
      id="project-inner-layout"
      className="bg-neutral-1 grid h-[calc(100vh-5rem)] w-full grid-cols-[24rem_1fr] grid-rows-[1fr] gap-2 overflow-hidden [grid-template-areas:'aside_main']"
    >
      {children}
    </div>
  );
}

export default ProjectInnerLayout;
