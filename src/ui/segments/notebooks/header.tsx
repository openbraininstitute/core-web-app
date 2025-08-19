'use client';

import { PlusOutlined } from '@ant-design/icons';

import { useTabs } from '@/components/detail-view-tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { cn } from '@/utils/css-class';

const ExploreSections = {
  AllPublic: 'public',
  Project: 'project',
} as const;

export type ExploreSectionsKeys = (typeof ExploreSections)[keyof typeof ExploreSections];

const tabsConfigItems: Array<{
  key: ExploreSectionsKeys;
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: ExploreSections.AllPublic,
    title: 'Public',
    position: 'first',
  },
  {
    key: ExploreSections.Project,
    title: 'Project',
    position: 'last',
  },
];

function NotebookTabs() {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab, onChangeTab } = useTabs<ExploreSectionsKeys & 'bookmarks'>({
    // @ts-ignore
    tabsConfig: tabsConfigItems,
    tabKey: 'scope',
    shallow: false,
    clearOnDefault: false,
    defaultKey: 'public',
  });

  return (
    <PillTabs
      value={activeTab ?? 'public'}
      defaultValue={activeTab ?? 'public'}
      className="w-full"
      activationMode="manual"
      onValueChange={(value) => {
        onChangeTab(value as ExploreSectionsKeys)();
      }}
    >
      <PillTabsList
        className={cn('grid h-10 w-full grid-cols-2 bg-white p-0 shadow-2xl', {
          'h-12': breakpoint === 'xl',
        })}
      >
        {tabsConfigItems.map((tab) => (
          <PillTabsTrigger
            key={tab.key}
            value={tab.key}
            position={tab.position}
            className={cn(
              'data-[state=active]:bg-primary-9 hover:bg-neutral-1 hover:text-primary-8 h-10 px-14! py-3 text-base select-none data-[state=active]:font-bold data-[state=active]:text-white',
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

export function NotebookHeader() {
  const breakpoint = useDefaultBreakpoint();

  return (
    <div className="flex w-full items-center justify-between gap-4 px-3 [grid-area:header]">
      <div className="flex max-w-1/2 items-center justify-center gap-2">
        <NotebookTabs />
      </div>
      <div className="max-w-1/2">
        <Button
          rounded
          variant="success"
          size={breakpoint === 'xl' ? 'lg' : 'md'}
          type="button"
          className="px-8"
        >
          <div className="flex items-center justify-between gap-5">
            <span>Register notebook</span>
            <PlusOutlined className="ml-auto text-sm" />
          </div>
        </Button>
      </div>
    </div>
  );
}
