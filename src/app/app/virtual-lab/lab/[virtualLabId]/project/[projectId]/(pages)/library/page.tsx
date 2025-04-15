import type { Metadata } from 'next';
import sumBy from 'lodash/sumBy';

import BookmarksView from '@/features/bookmark/view';
import ErrorData from '@/components/message-banners/error';

import { getAvailableTabs, groupBookmarksByCategory } from '@/features/bookmark/helpers';
import { getAllBookmarksByCategory } from '@/api/virtual-lab-svc/queries/bookmark';
import { tryCatch } from '@/api/utils';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { BookmarkCategoryType } from '@/features/bookmark/helpers';

type Props = ServerSideComponentProp<WorkspaceContext, { c: BookmarkCategoryType; t: string }>;

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
  const { c: category, t: type } = await props.searchParams;
  const { virtualLabId, projectId } = await props.params;
  const { data: result, error } = await tryCatch(
    getAllBookmarksByCategory({ virtualLabId, projectId }, {})
  );
  const { list } = groupBookmarksByCategory(result?.data);

  console.log('ᦨ #  page.tsx:41 #  Page #  list:', list);

  const { activeCategory, tabs, availableTypeKeysPerCategory } = getAvailableTabs(category, list);
  const activeType = tabs.at(0)?.key!;

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
      key={`widget-${category}/${type}`}
      categoryTypes={availableTypeKeysPerCategory}
      activeCategory={activeCategory}
      virtualLabId={virtualLabId}
      activeType={activeType}
      projectId={projectId}
      tabs={tabs}
      list={list}
    />
  );
}
