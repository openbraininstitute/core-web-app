'use client';

import ObiLogo from '@/components/logo/obi-logo';
import { courseToolbarFlag, useFlag } from '@/features/feature-flags';
import { AiButton } from '@/ui/segments/ai/button';
import { Wallet } from '@/ui/segments/project/balance';
import { SpaceSwitcher } from '@/ui/segments/workspaces/space-switcher';
import { TopMenuNavigation } from '@/ui/segments/workspaces/top-menu-nav';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { ComponentProps } from 'react';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

export function WorkspaceTopMenu({ className }: Props) {
  const courseToolbar = useFlag(courseToolbarFlag.key);
  if (courseToolbar)
    return (
      // As the courses' bar: a white strip across the top, a hairline under it, the OBI logo at its
      // left; then the lab and project, the credits, and the sections as words, not pills.
      <div
        className={cn(
          '-mx-3 -mt-3 flex h-16 items-center justify-between gap-4 border-b border-[#e8e8e8] bg-white px-5',
          className
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <ObiLogo className="h-9 w-auto shrink-0 text-[#002766]" />
          <span className="h-7 w-px shrink-0 bg-[#e8e8e8]" />
          <SpaceSwitcher className="w-80" />
          <Wallet />
        </div>
        <div className="flex items-center gap-1">
          <HydrateWrapper>
            <TopMenuNavigation plain />
            <AiButton />
          </HydrateWrapper>
        </div>
      </div>
    );
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-start justify-center gap-2">
        <SpaceSwitcher className="w-93" />
        <Wallet />
      </div>
      <div className="flex items-center justify-center gap-2">
        <HydrateWrapper>
          <TopMenuNavigation />
          <AiButton />
        </HydrateWrapper>
      </div>
    </div>
  );
}

export default WorkspaceTopMenu;
