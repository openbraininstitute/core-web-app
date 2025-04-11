import { getSession } from '@/authFetch';
import { virtualLabApi } from '@/config';
import type {
  BookmarkRequest,
  AddBookmarkResponse,
  DeleteBookmarksResponse,
  BookmarksByCategoryResponse,
} from '@/api/virtual-lab-svc/queries/types';

const baseUri = `${virtualLabApi.url}/virtual-labs`;

export async function addBookmark(
  lab: string,
  labProject: string,
  { entity_id, resource_id, category }: BookmarkRequest
): Promise<AddBookmarkResponse> {
  const session = await getSession();
  const url = `${baseUri}/${lab}/projects/${labProject}/bookmarks`;
  const response = await fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify({
      entity_id,
      resource_id,
      category,
    }),
  });

  if (!response.ok) {
    throw new Error('Error add bookmark to project', { cause: await response.json() });
  }

  const result = await response.json();
  return result as AddBookmarkResponse;
}

export async function removeBookmark(
  lab: string,
  labProject: string,
  { resource_id, entity_id, category }: BookmarkRequest
): Promise<boolean> {
  const session = await getSession();
  const params = new URLSearchParams({
    entity_id,
    resource_id,
    category,
  });
  const url = `${baseUri}/${lab}/projects/${labProject}/bookmarks?${params.toString()}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error remove bookmark to project', { cause: await response.json() });
  }

  return true;
}

export async function getBookmarksByCategory(
  lab: string,
  labProject: string,
  token: string
): Promise<BookmarksByCategoryResponse> {
  const session = await getSession();
  const response = await fetch(`${baseUri}/${lab}/projects/${labProject}/bookmarks`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error get bookmarks by category', { cause: await response.json() });
  }

  const result = await response.json();
  return result as BookmarksByCategoryResponse;
}

export async function bulkRemoveBookmarks(
  lab: string,
  labProject: string,
  bookmarks: BookmarkRequest[]
): Promise<DeleteBookmarksResponse> {
  const session = await getSession();
  const url = `${baseUri}/${lab}/projects/${labProject}/bookmarks/bulk-delete`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.accessToken}`,
    },
    body: JSON.stringify(bookmarks),
  });

  if (!response.ok) {
    throw new Error('Error bulk remove bookmarks', { cause: await response.json() });
  }

  const result = await response.json();
  return result as DeleteBookmarksResponse;
}
