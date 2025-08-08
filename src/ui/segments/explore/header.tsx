'use client';

import { PlusOutlined } from '@ant-design/icons';

import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useTabs } from '@/components/detail-view-tabs';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

const ExploreSections = {
  AllPublic: 'all-public',
  Project: 'project',
  Bookmarks: 'bookmarks',
} as const;

type ExploreSectionsKeys = (typeof ExploreSections)[keyof typeof ExploreSections];

const tabsConfigItems: Array<{
  key: ExploreSectionsKeys;
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: ExploreSections.AllPublic,
    title: 'All public',
    position: 'first',
  },
  {
    key: ExploreSections.Project,
    title: 'Project',
    position: 'middle',
  },
  {
    key: ExploreSections.Bookmarks,
    title: 'Bookmarks',
    position: 'last',
  },
];

function ExploreTabs() {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab, onChangeTab } = useTabs<ExploreSectionsKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
  });

  return (
    <PillTabs
      value={activeTab ?? 'all-public'}
      defaultValue={activeTab ?? 'all-public'}
      className="w-full"
      activationMode="manual"
      onValueChange={(value) => {
        onChangeTab(value as ExploreSectionsKeys)();
      }}
    >
      <PillTabsList
        className={cn('grid h-10 w-full grid-cols-3 bg-white p-0 shadow-2xl', {
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

export function ExploreHeader() {
  const breakpoint = useDefaultBreakpoint();

  return (
    <div className="flex w-full items-center justify-between gap-4 px-3 [grid-area:header]">
      <div className="max-w-1/2">
        <ExploreTabs />
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
            <span>Upload data</span>
            <PlusOutlined className="ml-auto text-sm" />
          </div>
        </Button>
      </div>
    </div>
  );
}
