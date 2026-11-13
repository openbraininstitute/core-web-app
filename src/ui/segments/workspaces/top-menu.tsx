'use client';

import { aiButtonFlag, courseToolbarFlag, useFlag } from '@/features/feature-flags';
import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { Wallet } from '@/ui/segments/project/balance';
import { SpaceSwitcher } from '@/ui/segments/workspaces/space-switcher';
import { TopMenuNavigation } from '@/ui/segments/workspaces/top-menu-nav';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import type { ComponentProps } from 'react';

type Props = {
  className?: ComponentProps<'div'>['className'];
};

/**
 * The AI assistant's button, behind its flag: a circle that opens the panel, and closes it; navy only while the
 * panel is open (the user asked), white with a navy ring while it is shut.
 */
export function AiButton() {
  const { isCollapsed, setState } = usePanelState();
  const breakpoint = useDefaultBreakpoint();
  return (
    <button
      type="button"
      // where the onboarding tour points for the assistant, as the panel is gone while closed
      id="workspace-ai-button"
      onClick={() => setState(isCollapsed ? PanelState.Expanded : PanelState.Collapsed)}
      aria-label={isCollapsed ? 'Open the AI assistant' : 'Close the AI assistant'}
      aria-expanded={!isCollapsed}
      title="OBI Assistant"
      data-testid="ai-assistant-open-button"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold tracking-[0.5px] transition-all select-none active:scale-95',
        breakpoint === 'xl' ? 'size-12 text-[15px]' : 'size-10 text-[13px]',
        isCollapsed
          ? 'text-primary-9 border-primary-9/30 hover:border-primary-9 border-[1.5px] bg-white hover:bg-[#f4f7fc]'
          : 'bg-primary-9 hover:bg-primary-8 text-white shadow-md hover:shadow-[0_4px_14px_rgba(0,39,102,0.35)]'
      )}
    >
      AI
    </button>
  );
}

export function WorkspaceTopMenu({ className }: Props) {
  const aiButton = useFlag(aiButtonFlag.key);
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
            {aiButton && <AiButton />}
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
          {aiButton && <AiButton />}
        </HydrateWrapper>
      </div>
    </div>
  );
}

export default WorkspaceTopMenu;
