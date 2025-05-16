'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { match } from 'ts-pattern';
import { Fragment } from 'react';
import compact from 'lodash/compact';
import find from 'lodash/find';
import get from 'lodash/get';

import ListingTable from '@/features/bookmark/listing-table';
import EmptyData from '@/components/message-banners/info';
import ErrorData from '@/components/message-banners/error';

import { GroupedLibraryBookmarks } from '@/features/bookmark/helpers';
import { EntityTypeTabs, GroupTabs } from '@/features/bookmark/tabs';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { EntityCoreTypeGroup } from '@/entity-configuration/domain/types';
import type { LibraryBookmark } from '@/api/virtual-lab-svc/queries/types';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { DataType } from '@/constants/explore-section/list-views';
import type { WorkspaceContext } from '@/types/common';
import { resolveDataKey } from '@/utils/key-builder';

const Categories: Array<{ key: EntityCoreTypeGroup; label: string }> = [
  {
    key: 'experimental',
    label: 'Experimental data',
  },
  {
    key: 'models',
    label: 'Models',
  },
  {
    key: 'simulations',
    label: 'Simulations',
  },
];

interface Props extends WorkspaceContext {
  activeCategory: EntityCoreTypeGroup;
  activeSlug: EntitySlugValue;
  categoryTypes: Record<string, string[]>;
  list?: GroupedLibraryBookmarks | null;
  tabs: Array<{
    key: EntitySlugValue | undefined;
    label: string;
    name: string;
  }>;
}

export default function BookmarksView({
  tabs,
  activeCategory,
  activeSlug,
  list,
  categoryTypes,
  virtualLabId,
  projectId,
}: Props) {
  const pathname = usePathname();
  const queryState = useSearchParams();
  const category = queryState.get('c')! ?? (activeCategory as EntitySlugValue);
  const slug = queryState.get('t')! ?? activeSlug;
  let data = [];

  const entity = getEntityBySlug({ slug: slug as EntitySlugValue });
  if (entity && entity.legacyType) {
    data = get(get(list, category), entity.legacyType, []);
  }

  const ids = compact<string>(data?.map((o: LibraryBookmark) => o.entity_id));
  const dataKey = resolveDataKey({ section: 'bookmark', projectId, suffix: `${category}/${slug}` });

  const tableList = match(tabs)
    .when(
      (value) => !!Boolean(value.length),
      () => (
        <Fragment key="bookmark-list">
          <EntityTypeTabs items={tabs} activeSlug={slug} basePath={pathname} category={category} />
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
                  key={`${activeCategory}/${activeSlug}`}
                  virtualLabId={virtualLabId}
                  projectId={projectId}
                  dataType={entity?.legacyType as DataType}
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
      <GroupTabs
        categoryTypes={categoryTypes}
        items={Categories}
        activeCategory={category}
        basePath={pathname}
      />
      <div className="h-full max-h-[calc(100vh-125px)] w-full">
        <ErrorBoundary
          fallback={
            <ErrorData
              title="Something went wrong"
              description={`We couldn’t load your bookmarked resources for ${category ?? ''} in project. Please try again later or contact support if the issue persists.`}
            />
          }
        >
          {tableList}
        </ErrorBoundary>
      </div>
    </div>
  );
}
