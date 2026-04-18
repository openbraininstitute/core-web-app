'use client';

import { RiTeamLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useState } from 'react';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Modal } from '@/ui/molecules/modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { TeamManager } from '@/ui/segments/project/team/team';
import { ProjectTeamSkeleton } from '@/ui/segments/project/team/team-skeleton';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

export function MembersPill() {
  const breakpoint = useDefaultBreakpoint();
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });
  const projectName = project?.data.project.name;

  return (
    <>
      <Tooltip open={open ? false : tooltipOpen}>
        <TooltipTrigger
          asChild
          onPointerEnter={() => setTooltipOpen(true)}
          onPointerLeave={() => setTooltipOpen(false)}
        >
          <Badge
            asChild
            rounded
            id="workspace-project-members"
            className={cn(
              'font-bold bg-background select-none cursor-pointer shrink-0',
              'hover:shadow-sm hover:bg-background',
              'p-0! flex items-center justify-center',
              breakpoint === 'xl' ? 'size-12!' : 'size-10!'
            )}
            variant="outline"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
          >
            <button type="button" onClick={() => setOpen(true)} aria-label="View project members">
              <RiTeamLine className="text-primary-9 size-6! w-6! h-6!" />
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="bottom"
          sideOffset={1}
          collisionPadding={{ bottom: 20 }}
          className="text-primary-8 max-w-[200px] bg-white text-base text-balance shadow-lg"
          arrowClassName="bg-white"
        >
          <div className="font-bold">Project Members</div>
          <p className="hyphens-auto">View and manage members of this project.</p>
        </TooltipContent>
      </Tooltip>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <div className="flex flex-col">
            <span>Project members</span>
            {projectName && (
              <span className="text-neutral-4 text-sm font-normal">{projectName}</span>
            )}
          </div>
        }
        size="xl"
        destroyOnClose
        bodyClassName="px-2 py-2"
      >
        <Suspense fallback={<ProjectTeamSkeleton />}>
          <div className="flex h-[70vh] w-full flex-col [&_.ant-table-body]:max-h-[calc(70vh-100px)]!">
            <TeamManager />
          </div>
        </Suspense>
      </Modal>
    </>
  );
}

export default MembersPill;
