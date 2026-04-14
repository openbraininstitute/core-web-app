'use client';

import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ProjectInnerLayout({ children }: Props) {
  useDisableElementOverflow({});

  return (
    <div
      id="project-inner-layout"
      className="bg-background grid h-[calc(100vh-6rem)] w-full grid-cols-[24rem_1fr] grid-rows-[1fr] gap-4 overflow-hidden [grid-template-areas:'aside_main']"
    >
      {children}
    </div>
  );
}

export default ProjectInnerLayout;
