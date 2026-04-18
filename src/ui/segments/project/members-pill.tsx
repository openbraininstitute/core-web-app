'use client';

import { RiTeamLine } from '@remixicon/react';
import { Suspense, useState } from 'react';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Badge } from '@/ui/molecules/badge';
import { Modal } from '@/ui/molecules/modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { TeamManager } from '@/ui/segments/project/team/team';
import { ProjectTeamSkeleton } from '@/ui/segments/project/team/team-skeleton';
import { cn } from '@/utils/css-class';

export function MembersPill() {
  const breakpoint = useDefaultBreakpoint();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
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
        title="Members"
        size="xl"
        destroyOnClose
        bodyClassName="px-2 py-2"
      >
        <Suspense fallback={<ProjectTeamSkeleton />}>
          <div className="flex h-[70vh] w-full flex-col">
            <TeamManager />
          </div>
        </Suspense>
      </Modal>
    </>
  );
}

export default MembersPill;
