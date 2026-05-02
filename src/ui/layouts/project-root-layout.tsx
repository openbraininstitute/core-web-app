'use client';

import { redirect } from 'next/navigation';

import { useSuspenseWorkspaceAccessControl } from '@/hooks/use-user-membership';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { projectTour, useNextStepOnboarding } from '@/ui/segments/app-setup/discover-app';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ProjectRootLayout({ children }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  useNextStepOnboarding({ condition: true, tour: projectTour });

  const { hasWorkspaceAccess, error } = useSuspenseWorkspaceAccessControl({
    virtualLabId,
    projectId,
  });

  if (!error && !hasWorkspaceAccess) {
    redirect('/app/virtual-lab/forbidden');
  }

  return (
    <div
      id="project-root-layout"
      className={cn(
        'bg-background grid h-screen w-full',
        "grid-rows-[5rem_1fr] gap-y-2 overflow-hidden [grid-template-areas:'header''main']"
      )}
    >
      {children}
    </div>
  );
}

export default ProjectRootLayout;
