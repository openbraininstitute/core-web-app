'use client';

import { useQuery } from '@tanstack/react-query';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { openSpaceSwitcher } from '@/ui/segments/workspaces/space-switcher/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { ComponentProps, ReactElement } from 'react';

/** Rendered only while its tooltip is open, so the project is fetched on demand. */
function ProjectScopeHint() {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
    enabled: !!virtualLabId && !!projectId,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span>Project{project?.name ? `: ${project.name}` : ''}</span>
      <button
        type="button"
        onClick={openSpaceSwitcher}
        className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold transition-colors hover:bg-white/25"
      >
        Change project
      </button>
    </div>
  );
}

interface IScopeTooltipProps {
  isPublic: boolean;
  /** the hovered element; Radix hands it a ref and its handlers */
  children: ReactElement;
  side?: ComponentProps<typeof TooltipContent>['side'];
  delayDuration?: number;
}

/** The scope's hover card, shared by the header toggles and the row icons. */
export function ScopeTooltip({
  isPublic,
  children,
  side = 'bottom',
  delayDuration,
}: IScopeTooltipProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      {/* the label keeps the screen-reader copy of the content free of its button */}
      <TooltipContent side={side} sideOffset={4} aria-label={isPublic ? 'Public' : 'Project'}>
        {isPublic ? 'Public' : <ProjectScopeHint />}
      </TooltipContent>
    </Tooltip>
  );
}
