import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';

import type { DataType } from '@/constants/explore-section/list-views';
import type { WorkspaceContext } from '@/types/common';
import type {
  BookmarkRequest,
  AddBookmarkResponse,
  DeleteBookmarksResponse,
  VlmGetProjectBookmarksResponse,
} from '@/api/virtual-lab-svc/queries/types';

const baseUri = '/virtual-labs';
/**
 * Bookmarks an entity to a specific project library within a virtual lab.
 *
 * @param {string} virtualLabId - The identifier of the virtual lab.
 * @param {string} projectId - The identifier of the project within the lab.
 * @param {BookmarkRequest} bookmarkDetails - Details of the bookmark to add.
 * @param {string} bookmarkDetails.entity_id - The ID of the entity being bookmarked.
 * @param {string} bookmarkDetails.resource_id - The ID of the resource being bookmarked (optional, for legacy data).
 * @param {string} bookmarkDetails.category - The category to place the bookmark under.
 * @returns {Promise<AddBookmarkResponse>} A promise that resolves with the response after adding the bookmark.
 */
export async function bookmarkToProjectLibrary(
  { virtualLabId, projectId }: WorkspaceContext,
  { entity_id, resource_id, category }: BookmarkRequest
): Promise<AddBookmarkResponse> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/projects/${projectId}/bookmarks`;

  return await api.post<AddBookmarkResponse>(url, {
    body: {
      entity_id,
      resource_id,
      category,
    },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

/**
 * Removes a specific bookmark from a project library within a virtual lab.
 *
 * @param {string} lab - The identifier of the virtual lab.
 * @param {string} labProject - The identifier of the project within the lab.
 * @param {BookmarkRequest} bookmarkDetails - Details of the bookmark to remove.
 * @param {string} bookmarkDetails.resource_id - The ID of the resource to un-bookmark.
 * @param {string} bookmarkDetails.entity_id - The ID of the entity to un-bookmark.
 * @param {string} bookmarkDetails.category - The category of the bookmark to remove.
 * @returns {Promise<boolean>} A promise that resolves to true if the bookmark was successfully removed, false otherwise.
 */
async function removeBookmarkFromProjectLibrary(
  { virtualLabId, projectId }: WorkspaceContext,
  { resource_id, entity_id, category }: BookmarkRequest
): Promise<boolean> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/projects/${projectId}/bookmarks`;
  return await api.delete<boolean>(url, {
    queryParams: {
      entity_id,
      resource_id,
      category,
    },
  });
}

/**
 * Retrieves all bookmarks for a specific project, grouped by category.
 *
 * @param {string} lab - The identifier of the virtual lab.
 * @param {string} labProject - The identifier of the project within the lab.
 * @returns {Promise<VlmGetProjectBookmarksResponse>} A promise that resolves with all bookmarks categorized.
 */
export async function getAllBookmarksByCategory(
  { virtualLabId, projectId }: WorkspaceContext,
  { category }: { category?: DataType }
): Promise<VlmGetProjectBookmarksResponse> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/projects/${projectId}/bookmarks${category ? `?category=${category}` : ''}`;
  return await api.get<VlmGetProjectBookmarksResponse>(url, {
    cache: 'no-store',
    next: {
      tags: ['list-bookmarks'],
    },
  });
}

/**
 * Deletes multiple bookmarks from a project library based on the provided list.
 *
 * @param {string} lab - The identifier of the virtual lab.
 * @param {string} labProject - The identifier of the project within the lab.
 * @param {BookmarkRequest[]} bookmarks - An array of bookmark details to delete.
 * @returns {Promise<DeleteBookmarksResponse>} A promise that resolves with the response after attempting to delete the bookmarks.
 */
export async function deleteBookmarksFromProjectLibrary(
  { virtualLabId, projectId }: WorkspaceContext,
  { bookmarks }: { bookmarks: BookmarkRequest[] }
): Promise<DeleteBookmarksResponse> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/projects/${projectId}/bookmarks/delete`;
  return await api.post<DeleteBookmarksResponse>(url, {
    body: { bookmarks },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}
