'use client';

import type { ComponentProps } from 'react';

import { Wallet } from '@/ui/segments/project/balance';
import { SpaceSwitcher } from '@/ui/segments/workspaces/space-switcher';
import { TopMenuNavigation } from '@/ui/segments/workspaces/top-menu-nav';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

export function WorkspaceTopMenu({ className }: Props) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div className="flex min-w-0 items-start justify-center gap-2">
        <SpaceSwitcher className="w-[calc(24rem-1.5rem)]" />
        <Wallet />
      </div>
      <div className="flex items-center justify-center gap-2 pr-3">
        <HydrateWrapper>
          <TopMenuNavigation />
        </HydrateWrapper>
      </div>
    </div>
  );
}

export default WorkspaceTopMenu;
