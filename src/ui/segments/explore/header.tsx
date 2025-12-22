'use client';

import { PlusOutlined } from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTabs } from '@/components/detail-view-tabs';
import { config } from '@/config';
import { type TWorkspaceScope, WorkspaceScope } from '@/constants';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
} from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

const ExploreSections = {
  Public: 'public',
  Project: 'project',
} as const;
const ExploreBookmarkSection = 'bookmark' as const;

export type ExploreSectionsKeys =
  | (typeof ExploreSections)[keyof typeof ExploreSections]
  | typeof ExploreBookmarkSection;

const tabsConfigItems: Array<{
  key: Partial<ExploreSectionsKeys>;
  title: string;
}> = [
  {
    key: ExploreSections.Public,
    title: 'Public',
  },
  {
    key: ExploreSections.Project,
    title: 'Project',
  },
];

// function BookmarkButton() {
//   const breakpoint = useDefaultBreakpoint();
//   const segments = useSelectedLayoutSegments();
//   const { virtualLabId, projectId } = useWorkspace();

//   const { data, isLoading, error } = useQuery({
//     queryKey: keyBuilder.bookmarkCategories({ virtualLabId, projectId }),
//     queryFn: () => getProjectBookmarkCategories({ virtualLabId, projectId }),
//     select: (response) => response.data,
//   });

//   const total = sum(Object.values(data ?? {}));

//   return (
//     <Button
//       rounded
//       size="lg"
//       variant="outline"
//       className={cn(
//         'inline-flex h-full items-center justify-center px-6 py-3 text-sm font-medium',
//         'transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
//         'w-max whitespace-nowrap shadow-2xl disabled:pointer-events-none disabled:opacity-50',
//         'hover:bg-neutral-1 hover:text-primary-8 h-10 border-none',
//         'py-3 text-base select-none',
//         { 'h-12': breakpoint === 'xl' },
//         { 'bg-primary-9 font-bold text-white': last(segments) === 'bookmarks' }
//       )}
//       asChild
//     >
//       <Link
//         href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/bookmarks?group=${EntityTypeGroup.Experimental}`}
//         className="flex w-full items-center justify-between gap-6"
//       >
//         <span>Bookmarks</span>
//         {/* eslint-disable-next-line no-nested-ternary */}
//         {isLoading ? <LoadingOutlined spin /> : error ? <WarningOutlined /> : total}
//       </Link>
//     </Button>
//   );
// }

function DataTabs() {
  const navigate = useRouter().push;
  const pathname = usePathname();
  const breakpoint = useDefaultBreakpoint();
  const { setMdv } = useMiniDetailView();
  const { virtualLabId, projectId } = useWorkspace();
  const { activeTab, onChangeTab } = useTabs({
    tabsConfig: tabsConfigItems,
    clearOnDefault: false,
    defaultKey: ExploreSections.Public,
    shallow: true,
    tabKey: 'scope',
  });

  const onTabClick = (value: string) => {
    makeSelectEntityClickEvent({ display: false, data: null });
    setMdv(false);
    if (
      pathname === `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data` ||
      pathname.startsWith(`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data/browse/entity`)
    ) {
      onChangeTab(value)();
    } else navigate(`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/data?scope=${value}`);
  };

  const isBookmark = pathname.endsWith('/browse/bookmarks');
  const currentScope = isBookmark ? undefined : (activeTab ?? undefined);

  return (
    <>
      <PillTabs
        id="scope-selector"
        data-testid="scope-selector"
        key={activeTab}
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
      {/* <BookmarkButton /> */}
    </>
  );
}

export function DataHeader() {
  const searchParams = useSearchParams();
  const scope = (searchParams.get('scope') as TWorkspaceScope) ?? WorkspaceScope.Public;
  const breakpoint = useDefaultBreakpoint();

  const onContribute = () => {
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType: null,
      sessionId: crypto.randomUUID(),
    });
  };

  return (
    <div className="flex w-full items-center justify-between gap-4 px-3 [grid-area:header]">
      <div className="flex max-w-1/2 items-center justify-center gap-2">
        <DataTabs />
      </div>
      {scope === WorkspaceScope.Project && (
        <div className="max-w-1/2" id="upload-data-selector" data-testid="upload-data-selector">
          <Button
            rounded
            variant="success"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            type="button"
            className="px-8"
            onClick={onContribute}
          >
            <div className="flex items-center justify-between gap-5">
              <span>Upload data</span>
              <PlusOutlined className="ml-auto text-sm" />
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
