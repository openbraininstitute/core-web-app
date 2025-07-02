'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import {
  deleteBookmarksFromProjectLibrary as deleteBookmark,
  bookmarkToProjectLibrary as addBookmark,
} from '@/api/virtual-lab-svc/queries/bookmark';
import { resolveLibraryUrl } from '@/utils/url-builder';

import type { BookmarkRequest } from '@/api/virtual-lab-svc/queries/types';
import type { WorkspaceContext } from '@/types/common';

export async function addBookmarksToProjectLibrary({
  virtualLabId,
  projectId,
  bookmark,
}: WorkspaceContext & {
  bookmark: BookmarkRequest;
}) {
  const result = await addBookmark({ virtualLabId, projectId }, { ...bookmark });
  revalidateTag('list-bookmarks');

  revalidatePath(
    resolveLibraryUrl({
      ctx: { virtualLabId, projectId },
    })
  );
  return result;
}

export async function deleteBookmarksFromProjectLibrary({
  virtualLabId,
  projectId,
  bookmarks,
}: WorkspaceContext & {
  bookmarks: Array<BookmarkRequest>;
}) {
  const result = await deleteBookmark({ virtualLabId, projectId }, { bookmarks });
  revalidateTag('list-bookmarks');
  revalidatePath(
    resolveLibraryUrl({
      ctx: { virtualLabId, projectId },
    })
  );
  return result;
}
