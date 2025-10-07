'use client';

import { parseAsString, useQueryStates } from 'nuqs';
import { ErrorBoundary } from 'react-error-boundary';
import { usePathname } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { match } from 'ts-pattern';
import { useEffect } from 'react';

import compact from 'es-toolkit/compat/compact';
import get from 'es-toolkit/compat/get';

import ListingTable from '@/features/bookmark/listing-table';
import EmptyData from '@/components/message-banners/info';
import ErrorData from '@/components/message-banners/error';

import { entityTargetIdentifiersAtom } from '@/state/explore-section/list-view-atoms';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { EntityTypeTabs, GroupTabs } from '@/features/bookmark/tabs';
import { resolveDataKey } from '@/utils/key-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { LibraryBookmark } from '@/api/virtual-lab-svc/queries/types';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { GroupedLibraryBookmarks } from '@/features/bookmark/helpers';
import type { WorkspaceContext } from '@/types/common';

const Categories: Array<{ key: TEntityTypeGroup; label: string }> = [
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
  activeCategory: TEntityTypeGroup;
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
  const [{ category, slug }] = useQueryStates(
    {
      category: parseAsString
        .withDefault(activeCategory as EntitySlugValue)
        .withOptions({ clearOnDefault: false }),
      slug: parseAsString.withDefault(activeSlug).withOptions({ clearOnDefault: false }),
    },
    {
      urlKeys: {
        category: 'c',
        slug: 't',
      },
      shallow: false,
      clearOnDefault: false,
    }
  );

  const dataKey = resolveDataKey({ section: 'bookmark', projectId, suffix: `${category}/${slug}` });

  const updateTargetIds = useSetAtom(entityTargetIdentifiersAtom(dataKey));
  let data = [];

  const entity = getEntityBySlug({ slug: slug as EntitySlugValue });
  if (entity && entity.extendedType) {
    data = get(get(list, category), entity.extendedType, []);
  }

  const ids = compact<string>(data?.map((o: LibraryBookmark) => o.entity_id));

  useEffect(() => {
    // if (!ids.length && slug !== tabs.at(0)?.key) {
    //   updateQuery({ category, slug: tabs.at(0)?.key ?? null });
    // } else {
    // }
    if (ids.length) {
      updateTargetIds(ids);
    }
    return () => updateTargetIds([]);
  }, [ids, updateTargetIds]);

  const tableList = match(tabs)
    .when(
      (value) => !!value.length,
      () => (
        <>
          <EntityTypeTabs
            key={`${category}/${slug}`}
            items={tabs}
            activeSlug={slug}
            basePath={pathname}
            category={category}
          />
          <div className="text-primary-8 h-[calc(100%-50px)] bg-white">
            <div className="border-primary-6 h-full border border-t-0 p-5">
              <ErrorBoundary
                fallback={
                  <ErrorData
                    borderless
                    cls={{ container: '!text-primary-8 !bg-transparent w-full' }}
                    title="Something went wrong"
                    description="We couldn’t load your bookmarked resources. Please try again later or contact support if the issue persists."
                  />
                }
              >
                <ListingTable<EntityCoreIdentifiable>
                  key={dataKey}
                  virtualLabId={virtualLabId}
                  projectId={projectId}
                  dataType={entity?.extendedType as TExtendedEntitiesTypeDict}
                  dataKey={dataKey}
                />
              </ErrorBoundary>
            </div>
          </div>
        </>
      )
    )
    .otherwise(() => (
      <EmptyData
        title="We could not find any bookmarks saved in your account"
        description={`You haven't saved any bookmarks for ${category} data yet. Start bookmarking content to find it here later.`}
        cls={{ container: '!text-primary-8 !bg-transparent max-w-full' }}
      />
    ));

  return (
    <div className="mr-5 h-[calc(100%-2rem)] px-4">
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
