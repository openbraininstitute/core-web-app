'use client';

import { PlusOutlined } from '@ant-design/icons';

import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useTabs } from '@/components/detail-view-tabs';
import { Button } from '@/ui/molecules/button';
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

function ExploreTabs() {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab, onChangeTab } = useTabs<ExploreSectionsKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'scope',
    shallow: true,
    clearOnDefault: false,
    defaultKey: 'public',
  });

  const onBookmarkClick = () => onChangeTab('bookmarks');
  return (
    <>
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
      <Button
        rounded
        size="lg"
        variant="outline"
        className={cn(
          'inline-flex h-full items-center justify-center px-6 py-3 text-sm font-medium whitespace-nowrap shadow-2xl transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          'hover:bg-neutral-1 hover:text-primary-8 h-10 border-none px-14! py-3 text-base select-none',
          { 'h-12': breakpoint === 'xl' }
        )}
        onClick={onBookmarkClick}
      >
        Bookmarks
      </Button>
    </>
  );
}

export function ExploreHeader() {
  const breakpoint = useDefaultBreakpoint();

  return (
    <div className="flex w-full items-center justify-between gap-4 px-3 [grid-area:header]">
      <div className="flex max-w-1/2 items-center justify-center gap-2">
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
