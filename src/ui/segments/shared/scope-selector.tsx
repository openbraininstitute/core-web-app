'use client';

import { FolderAdminOpen, FolderPublicOpen } from '@/components/icons';
import { WorkspaceScope } from '@/constants';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { MotionTabs, MotionTabsList, MotionTabsTrigger } from '@/ui/molecules/motion-tabs';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

interface Props {
  id?: string;
  activeTab: string;
  className?: string;
  onValueChange: (value: string) => void;
  items?: Array<{ key: string; title: string; icon?: ReactNode; disabled?: boolean }>;
  /** Pin the pill to h-10 and size tabs to their labels, for callers in a row of 40px controls. */
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
              // the 3.5rem-a-side padding is the only thing stretching these tabs
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

const scopeIcons: Record<string, typeof FolderPublicOpen> = {
  [WorkspaceScope.Public]: FolderPublicOpen,
  [WorkspaceScope.Project]: FolderAdminOpen,
};

/**
 * Icon-only scope switch for a toolbar row, where the labelled pill is too wide. The
 * title moves into a tooltip, so the control still names itself.
 */
export function IconTabsSelector({
  id = 'scope-selector',
  activeTab,
  onValueChange,
  className,
  items = tabsConfigItems,
}: Omit<Props, 'compact'>) {
  return (
    <MotionTabs
      variant="pill"
      value={activeTab}
      onValueChange={onValueChange}
      className={cn('shrink-0', className)}
    >
      <MotionTabsList
        id={id}
        data-testid={id}
        className="border-neutral-2 h-10 w-auto gap-0.5 rounded-full border bg-white p-1"
      >
        {items.map((tab) => {
          const Icon = scopeIcons[tab.key];
          return (
            <Tooltip key={tab.key}>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <MotionTabsTrigger
                    id={`scope-selector-tab-${tab.key}`}
                    data-testid={`scope-selector-tab-${tab.key}`}
                    value={tab.key}
                    disabled={tab.disabled}
                    aria-label={tab.title}
                    wrapperClassName="flex-none"
                    className="size-8 px-0 py-0"
                    indicatorClassName="rounded-full"
                  >
                    {Icon ? <Icon className="size-4.5" /> : tab.title}
                  </MotionTabsTrigger>
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="text-primary-9 border-neutral-2 border bg-white shadow-md"
                arrowClassName="bg-white"
              >
                {tab.title}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </MotionTabsList>
    </MotionTabs>
  );
}
