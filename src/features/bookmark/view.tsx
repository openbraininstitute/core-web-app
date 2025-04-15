'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { match } from 'ts-pattern';
import { Fragment } from 'react';

import kebabCase from 'lodash/kebabCase';
import compact from 'lodash/compact';
import find from 'lodash/find';
import get from 'lodash/get';

import ListingTable from '@/features/bookmark/listing-table';
import EmptyData from '@/components/message-banners/info';
import ErrorData from '@/components/message-banners/error';

import { DATA_CATEGORY_TABS, GroupedLibraryBookmarks } from '@/features/bookmark/helpers';
import { EntityTypeTabs, DataTypeTabs } from '@/features/bookmark/tabs';
import { toPascalCase } from '@/utils/string';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { LibraryBookmark } from '@/api/virtual-lab-svc/queries/types';
import type { BookmarkCategoryType } from '@/features/bookmark/helpers';
import type { DataType } from '@/constants/explore-section/list-views';
import type { WorkspaceContext } from '@/types/common';

interface Props extends WorkspaceContext {
  activeCategory: BookmarkCategoryType;
  activeType: string;
  categoryTypes: Record<string, string[]>;
  list?: GroupedLibraryBookmarks | null;
  tabs: Array<{
    key: string;
    label: string;
    name: string;
  }>;
}

export default function BookmarksView({
  tabs,
  activeCategory,
  activeType,
  list,
  categoryTypes,
  virtualLabId,
  projectId,
}: Props) {
  const pathname = usePathname();
  const queryState = useSearchParams();
  const category = queryState.get('c')! ?? (activeCategory as BookmarkCategoryType);
  const type = queryState.get('t')! ?? kebabCase(activeType);

  const data = get(get(list, category), toPascalCase(type), []);
  const ids = compact<string>(data?.map((o: LibraryBookmark) => o.entity_id));
  const dataKey = `${projectId}/${category}/${type}/bookmarks`;

  const tableList = match(tabs)
    .when(
      (value) => !!Boolean(value.length),
      () => (
        <Fragment key="bookmark-list">
          <EntityTypeTabs items={tabs} activeType={type} basePath={pathname} category={category} />
          <div className="text-primary-8 h-[calc(100%-50px)] bg-white">
            <div className="border-primary-6 h-full border border-t-0 p-5">
              <ErrorBoundary
                fallback={
                  <ErrorData
                    borderless
                    cls={{ container: '!text-primary-8 !bg-transparent' }}
                    title="Something went wrong"
                    description={`We couldn’t load your bookmarked resources. Please try again later or contact support if the issue persists.`}
                  />
                }
              >
                <ListingTable<EntityCoreIdentifiable>
                  key={`${activeCategory}/${activeType}`}
                  virtualLabId={virtualLabId}
                  projectId={projectId}
                  dataType={toPascalCase(type) as DataType}
                  targetIds={ids}
                  dataKey={dataKey}
                />
              </ErrorBoundary>
            </div>
          </div>
        </Fragment>
      )
    )
    .otherwise(() => (
      <EmptyData
        title="We could not find any bookmarks saved in your account"
        description={`You haven't saved any bookmarks for ${category} data yet. Start bookmarking content to find it here later.`}
      />
    ));

  return (
    <div className="mr-5 h-[calc(100%-2rem)] max-w-7xl px-4">
      <DataTypeTabs
        categoryTypes={categoryTypes}
        items={DATA_CATEGORY_TABS}
        activeCategory={category}
        basePath={pathname}
      />
      <div className="h-full max-h-[calc(100vh-125px)] w-full">
        <ErrorBoundary
          fallback={
            <ErrorData
              title="Something went wrong"
              description={`We couldn’t load your bookmarked resources for ${get(find(DATA_CATEGORY_TABS, { key: category }), 'label') ?? ''} in project. Please try again later or contact support if the issue persists.`}
            />
          }
        >
          {tableList}
        </ErrorBoundary>
      </div>
    </div>
  );
}
