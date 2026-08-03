'use client';

import { WorkspaceScope } from '@/constants';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

interface Props {
  id?: string;
  activeTab: string;
  className?: string;
  onValueChange: (value: string) => void;
  items?: Array<{ key: string; title: string; icon?: ReactNode; disabled?: boolean }>;
  /**
   * TOOLBAR SIZING — pin the pill to h-10 instead of growing to h-12 on `xl`, and
   * size the tabs to their labels rather than to the default 3.5rem-a-side padding.
   * Opt-in, for callers that sit in a row of 40px controls (the data-grid toolbar);
   * every other caller keeps the roomy, responsive original.
   */
  compact?: boolean;
}

export const UiDeterminedScopes = {
  Public: WorkspaceScope.Public,
  Project: WorkspaceScope.Project,
} as const;

export type UiDeterminedScopesKeys = (typeof UiDeterminedScopes)[keyof typeof UiDeterminedScopes];

const tabsConfigItems: Array<{
  key: Partial<UiDeterminedScopesKeys>;
  title: string;
  icon?: ReactNode;
  disabled?: boolean;
}> = [
  {
    key: WorkspaceScope.Public,
    title: 'Public',
  },
  {
    key: WorkspaceScope.Project,
    title: 'Project',
  },
];

export function TabsSelector({
  id = 'scope-selector',
  activeTab,
  onValueChange,
  className,
  items = tabsConfigItems,
  compact = false,
}: Props) {
  const breakpoint = useDefaultBreakpoint();
  const tall = !compact && breakpoint === 'xl';
  return (
    <PillTabs
      id={id}
      data-testid={id}
      value={activeTab}
      className={cn('w-full min-w-0 shrink-0', className)}
      activationMode="manual"
      onValueChange={onValueChange}
    >
      <PillTabsList
        className={cn(
          'grid h-10 w-full grid-cols-2 bg-white p-0 shadow-md ml-0.5 min-w-0 shrink-0',
          {
            'h-12': tall,
          }
        )}
      >
        {items.map((tab) => (
          <PillTabsTrigger
            id={`scope-selector-tab-${tab.key}`}
            data-testid={`scope-selector-tab-${tab.key}`}
            key={tab.key}
            value={tab.key}
            disabled={tab.disabled}
            className={cn(
              'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 py-3 min-w-0',
              'text-base select-none data-[state=active]:font-bold data-[state=active]:text-white shrink-0',
              // The 3.5rem-a-side padding is what makes each tab as wide as the whole
              // species+region group beside it — nothing else stretches the control
              // (`PillTabs` already shrink-wraps under the caller's `max-w-max`). In a
              // toolbar row the tabs size to their labels instead; every other surface
              // keeps the roomy original.
              compact ? 'px-6' : 'px-14!',
              { 'h-12': tall }
            )}
          >
            <span className="inline-flex items-center gap-2">
              {tab.icon}
              {tab.title}
            </span>
          </PillTabsTrigger>
        ))}
      </PillTabsList>
    </PillTabs>
  );
}
