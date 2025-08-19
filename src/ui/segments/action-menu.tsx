'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOutlined,
  CopyOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import Action from '../molecules/side-menu-action';

import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';

import {
  bookmarkToProjectLibrary,
  getAllBookmarksByCategory,
} from '@/api/virtual-lab-svc/queries/bookmark';
import { useAppNotification } from '@/components/notification';
import { BookmarkCategory } from '@/api/virtual-lab-svc/queries/types';
import { deleteBookmarksFromProjectLibrary } from '@/features/bookmark/actions';

export default function ActionMenu<T extends EntityCoreIdentifiable>({
  entity,
  bookmarkCategory,
  ctx,
}: {
  entity: T;
  bookmarkCategory?: BookmarkCategory;
  ctx: { virtualLabId: string; projectId: string };
}) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const notification = useAppNotification();

  const bookmarks = useQuery({
    queryKey: [ctx.projectId, ctx.virtualLabId, bookmarkCategory],
    queryFn: async () => getAllBookmarksByCategory(ctx, { category: bookmarkCategory }),
  });

  const existingBookmarks = bookmarkCategory
    ? bookmarks.data?.data?.[bookmarkCategory]?.map((b) => b.entity_id)
    : undefined;

  const isBookmarked = existingBookmarks && existingBookmarks.includes(entity.id);

  const handleBookmark = async () => {
    if (!bookmarkCategory) return;
    setLoading(true);
    try {
      await bookmarkToProjectLibrary(ctx, {
        entity_id: entity.id,
        category: bookmarkCategory,
      });

      await queryClient.invalidateQueries({
        queryKey: [ctx.projectId, ctx.virtualLabId, bookmarkCategory],
      });

      notification.success({ message: 'Entity successfully bookmarked' });
    } catch {
      notification.error({ message: "Couldn't add entity to bookmarks" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async () => {
    if (!bookmarkCategory) return;

    setLoading(true);
    try {
      await deleteBookmarksFromProjectLibrary({
        virtualLabId: ctx.virtualLabId,
        projectId: ctx.projectId,
        bookmarks: [
          {
            entity_id: entity.id,
            category: bookmarkCategory,
          },
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: [ctx.projectId, ctx.virtualLabId, bookmarkCategory],
      });

      notification.success({ message: 'Bookmark removed from library' });
    } catch {
      notification.error({ message: "Couldn't remove bookmark" });
    } finally {
      setLoading(false);
    }
  };

  const getBookmarkHandler = () => {
    if (loading) return undefined;
    if (!isBookmarked) return handleBookmark;
    return handleRemoveBookmark;
  };

  return (
    <div className="text-primary-9 mt-10 flex flex-col gap-5 pr-20 pl-10 text-lg font-bold">
      <Action
        icon={
          !copied ? (
            <CopyOutlined
              onClick={() => {
                if (copied) return;
                setCopied(true);
                navigator.clipboard.writeText(entity.id);
                window.setTimeout(() => setCopied(false), 5000);
              }}
            />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em">
              <title>check</title>
              <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" fill="#3e0" />
            </svg>
          )
        }
      >
        {copied ? 'Copied' : 'Copy ID'}
      </Action>
      <Action icon={<ExperimentOutlined />}>Simulate</Action>
      {bookmarkCategory && bookmarks.data && (
        <Action
          icon={
            <>
              {!loading && <BookOutlined onClick={getBookmarkHandler()} />}
              {loading && <LoadingOutlined />}
            </>
          }
        >
          <>{!isBookmarked ? 'Bookmark' : 'Remove from bookmarks'}</>
        </Action>
      )}

      <Action icon={<DownloadOutlined />}>Download</Action>
    </div>
  );
}
