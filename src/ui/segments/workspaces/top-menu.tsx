'use client';

import Link from 'next/link';

import { HelpIcon } from '@/components/icons/buttons';
import { config } from '@/config';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { Wallet } from '@/ui/segments/project/balance';
import { SpaceSwitcher } from '@/ui/segments/workspaces/space-switcher';
import { TopMenuNavigation } from '@/ui/segments/workspaces/top-menu-nav';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { ComponentProps } from 'react';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

function HelpPill() {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          asChild
          rounded
          id="workspace-help-pill"
          className={cn(
            'font-bold bg-background select-none cursor-pointer shrink-0',
            'hover:shadow-sm hover:bg-background',
            'p-0! flex items-center justify-center',
            breakpoint === 'xl' ? 'size-12!' : 'size-10!'
          )}
          variant="outline"
          size={breakpoint === 'xl' ? 'lg' : 'md'}
        >
          <Link
            prefetch
            href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/help`}
            aria-label="Open help"
          >
            <HelpIcon className="text-primary-9 h-5! w-5!" />
          </Link>
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
        <div className="font-bold">Help</div>
        <p className="hyphens-auto">Tutorials, glossary, guides and more.</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function WorkspaceTopMenu({ className }: Props) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-start justify-center gap-2">
        <SpaceSwitcher className="w-93" />
        <Wallet />
        <HelpPill />
      </div>
      <div className="flex items-center justify-center gap-2">
        <HydrateWrapper>
          <TopMenuNavigation />
        </HydrateWrapper>
      </div>
    </div>
  );
}

export default WorkspaceTopMenu;
