'use client';

import type { ReactNode } from 'react';

import { projectTour, useNextStepOnboarding } from '@/ui/segments/app-setup/discover-app';
import { cn } from '@/utils/css-class';

type Props = {
  children: ReactNode;
};

export function ProjectRootLayout({ children }: Props) {
  useNextStepOnboarding({ condition: true, tour: projectTour });

  return (
    <div
      id="project-root-layout"
      className={cn(
        'bg-background grid h-screen w-full grid-cols-[1fr_minmax(3rem,auto)]',
        "grid-rows-[5rem_1fr] gap-2 overflow-hidden [grid-template-areas:'header_header''main_ai']"
      )}
    >
      {children}
    </div>
  );
}

export default ProjectRootLayout;
