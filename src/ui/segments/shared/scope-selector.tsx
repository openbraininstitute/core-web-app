'use client';

import { WorkspaceScope } from '@/constants';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { cn } from '@/utils/css-class';

interface Props {
  activeTab: string;
  className?: string;
  onValueChange: (value: string) => void;
  items?: Array<{ key: string; title: string }>;
}

export const UiDeterminedScopes = {
  Public: WorkspaceScope.Public,
  Project: WorkspaceScope.Project,
} as const;

export type UiDeterminedScopesKeys = (typeof UiDeterminedScopes)[keyof typeof UiDeterminedScopes];

const tabsConfigItems: Array<{
  key: Partial<UiDeterminedScopesKeys>;
  title: string;
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

export function WorkspaceScopeSelector({
  activeTab,
  onValueChange,
  className,
  items = tabsConfigItems,
}: Props) {
  const breakpoint = useDefaultBreakpoint();
  return (
    <PillTabs
      id="scope-selector"
      data-testid="scope-selector"
      key={activeTab}
      value={activeTab}
      className={cn('w-full', className)}
      activationMode="manual"
      onValueChange={onValueChange}
    >
      <PillTabsList
        className={cn('grid h-10 w-full grid-cols-2 bg-white p-0 shadow-md', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {items.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            className={cn(
              'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3',
              'text-base select-none data-[state=active]:font-bold data-[state=active]:text-white',
              { 'h-12': breakpoint === 'xl' }
            )}
          >
            {tab.title}
          </PillTabsTrigger>
        ))}
      </PillTabsList>
    </PillTabs>
  );
}
