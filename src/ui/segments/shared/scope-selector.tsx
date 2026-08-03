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
   * Pin the pill to h-10 instead of growing to h-12 on `xl`. Opt-in, for callers that
   * sit in a row with other h-10 controls (the data-grid toolbar, whose search pill
   * and toolbar buttons are all 40px); every other caller keeps the responsive size.
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
              'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 min-w-0',
              'text-base select-none data-[state=active]:font-bold data-[state=active]:text-white shrink-0',
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
