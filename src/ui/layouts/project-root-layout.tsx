'use client';

import { redirect } from 'next/navigation';

import { aiButtonFlag, useFlag } from '@/features/feature-flags';
import { useSuspenseWorkspaceAccessControl } from '@/hooks/use-user-membership';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { projectTour, useNextStepOnboarding } from '@/ui/segments/app-setup/discover-app';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ProjectRootLayout({ children }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  useNextStepOnboarding({ condition: true, tour: projectTour });
  // no rail for the AI assistant while it is closed and the top menu has its button: no column for it
  const aiButton = useFlag(aiButtonFlag.key);
  const { isCollapsed } = usePanelState();
  const noRail = aiButton && isCollapsed;

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
        noRail ? 'grid-cols-[1fr_0px] gap-x-0' : 'grid-cols-[1fr_minmax(3rem,auto)]',
        // the header row as tall as the toolbar, and the page straight under its line
        "grid-rows-[4rem_1fr] gap-x-2 gap-y-0 overflow-hidden [grid-template-areas:'header_header''main_ai']",
        // The workflow tabs sit closer under the toolbar than other pages' titles.
        'has-[.scan-config-tabs]:grid-rows-[4.25rem_1fr]',
        // on a phone the bar along the top is as tall as it needs, and the page has the width to itself (the
        // assistant opens over it)
        'max-md:grid-cols-[minmax(0,1fr)_0px] max-md:gap-x-0 max-md:grid-rows-[auto_minmax(0,1fr)] max-md:has-[.scan-config-tabs]:grid-rows-[auto_minmax(0,1fr)]'
      )}
    >
      {children}
    </div>
  );
}

export default ProjectRootLayout;
