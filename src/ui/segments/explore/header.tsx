'use client';

import { usePathname, useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { LoadingOutlined, PlusOutlined, WarningFilled } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import last from 'lodash/last';
import sum from 'lodash/sum';

import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { getProjectBookmarkCategories } from '@/api/virtual-lab-svc/queries/bookmark';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useTabs } from '@/components/detail-view-tabs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

const ExploreSections = {
  Public: 'public',
  Project: 'project',
} as const;

export type ExploreSectionsKeys = (typeof ExploreSections)[keyof typeof ExploreSections];

const tabsConfigItems: Array<{
  key: ExploreSectionsKeys;
  title: string;
  position: 'first' | 'middle' | 'last';
}> = [
  {
    key: ExploreSections.Public,
    title: 'Public',
    position: 'first',
  },
  {
    key: ExploreSections.Project,
    title: 'Project',
    position: 'last',
  },
];

function BookmarkButton() {
  const navigate = useRouter().push;
  const breakpoint = useDefaultBreakpoint();
  const segments = useSelectedLayoutSegments();
  const { virtualLabId, projectId } = useWorkspace();

  const { data, isLoading, isError } = useQuery({
    queryKey: keyBuilder.bookmarkCategories({ virtualLabId, projectId }),
    queryFn: () => getProjectBookmarkCategories({ virtualLabId, projectId }),
    select: (response) => response.data,
  });

  const total = sum(Object.values(data ?? {}));

  const onBookmarkClick = async () => {
    navigate(
      `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/browse/bookmarks?group=${EntityTypeGroup.Experimental}`
    );
  };

  return (
    <Button
      rounded
      size="lg"
      variant="outline"
      className={cn(
        'inline-flex h-full items-center justify-center px-6 py-3 text-sm font-medium whitespace-nowrap shadow-2xl transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        'hover:bg-neutral-1 hover:text-primary-8 group h-10 border-none py-3 text-base select-none',
        { 'h-12': breakpoint === 'xl' },
        { 'bg-primary-9 font-bold text-white': last(segments) === 'bookmarks' }
      )}
      onClick={onBookmarkClick}
    >
      <div className="flex w-full items-center justify-between gap-6">
        <span>Bookmarks</span>
        {isLoading ? ( // eslint-disable-line no-nested-ternary
          <LoadingOutlined spin />
        ) : isError ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <WarningFilled
                className={cn('text-destructive/60 group-hover:text-primary-9', {
                  'text-white': last(segments) === 'bookmarks',
                })}
              />
            </TooltipTrigger>
            <TooltipContent
              hideWhenDetached
              arrowPadding={0}
              sideOffset={4}
              side="bottom"
              align="center"
            >
              <p>
                Error occurred <br /> when fetching bookmarks
              </p>
              <TooltipArrow className="fill-primary-9" />
            </TooltipContent>
          </Tooltip>
        ) : (
          total
        )}
      </div>
    </Button>
  );
}

function ExploreTabs() {
  const navigate = useRouter().push;
  const pathname = usePathname();
  const breakpoint = useDefaultBreakpoint();
  const segments = useSelectedLayoutSegments();
  const { virtualLabId, projectId } = useWorkspace();

  const { activeTab, onChangeTab } = useTabs({
    tabsConfig: tabsConfigItems,
    clearOnDefault: false,
    defaultKey: ExploreSections.Public,
    shallow: true,
    tabKey: 'scope',
  });

  const onTabClick = (value: string) => {
    if (pathname === `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore`) {
      onChangeTab(value)();
    } else
      navigate(
        `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore?scope=${value}`
      );
  };

  const currentScope =
    segments.at(1) === 'entity' || !last(segments)
      ? (activeTab ?? ExploreSections.Public)
      : undefined;

  return (
    <>
      <PillTabs
        value={currentScope}
        className="w-full"
        activationMode="manual"
        onValueChange={onTabClick}
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
      <BookmarkButton />
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
