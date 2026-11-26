'use client';

import { redirect } from 'next/navigation';

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
  // no column for the AI assistant while it is closed: the top menu's button opens it
  const { isCollapsed: noRail } = usePanelState();

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
        // on a phone as tall as can be seen, the browser's bars showing or not (the full height put the foot under
        // them, the user saw the categories hidden)
        'bg-background grid h-screen w-full max-md:h-dvh',
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
