import type { Metadata } from 'next';
import sumBy from 'lodash/sumBy';

import BookmarksView from '@/features/bookmark/view';
import ErrorData from '@/components/message-banners/error';

import { getAvailableTabs, groupBookmarksByCategory } from '@/features/bookmark/helpers';
import { getAllBookmarksByCategory } from '@/api/virtual-lab-svc/queries/bookmark';
import { tryCatch } from '@/api/utils';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeGroup } from '@/entity-configuration/domain/types';

type Props = ServerSideComponentProp<
  WorkspaceContext,
  { c: EntityCoreTypeGroup; t: EntitySlugValue }
>;

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { virtualLabId, projectId } = await props.params;
  const { data: result } = await tryCatch(
    getAllBookmarksByCategory({ virtualLabId, projectId }, {})
  );
  const totalCount = sumBy(Object.values(result?.data ?? {}), (arr) => arr.length);

  return {
    title: `Project library (${totalCount})`,
    description: 'Collection of bookmarks that you have saved for this project.',
  };
}

export default async function Page(props: Props) {
  const { c: category, t: slug } = await props.searchParams;
  const { virtualLabId, projectId } = await props.params;
  const { data: result, error } = await tryCatch(
    getAllBookmarksByCategory({ virtualLabId, projectId }, {})
  );
  const { list } = groupBookmarksByCategory(result?.data);

  const { activeCategory, tabs, availableTypeKeysPerCategory } = getAvailableTabs(category, list);
  const activeSlug = tabs.at(0)?.key!;

  if (error) {
    return (
      <ErrorData
        title="Something went wrong"
        description="We couldn’t load your bookmarked resources for this project. Please try again later or contact support if the issue persists."
      />
    );
  }

  return (
    <BookmarksView
      key={`widget-${category}/${slug}`}
      categoryTypes={availableTypeKeysPerCategory}
      activeCategory={activeCategory}
      virtualLabId={virtualLabId}
      activeSlug={activeSlug}
      projectId={projectId}
      tabs={tabs}
      list={list}
    />
  );
}
