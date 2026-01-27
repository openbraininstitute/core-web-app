import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  AddBookmarkResponse,
  BookmarkRequest,
  DeleteBookmarksResponse,
  VlmGetProjectBookmarksResponse,
  VlmGetProjectLibraryCategories,
  VlmGetProjectLibraryPerCategory,
} from '@/api/virtual-lab-svc/queries/types';
import { virtualLabRootApi } from '@/api/virtual-lab-svc/utils';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/virtual-labs';

/**
 * Bookmarks an entity to a specific project library within a virtual lab.
 *
 * @param {string} virtualLabId - The identifier of the virtual lab.
 * @param {string} projectId - The identifier of the project within the lab.
 * @param {BookmarkRequest} bookmarkDetails - Details of the bookmark to add.
 * @param {string} bookmarkDetails.entity_id - The ID of the entity being bookmarked.
 * @param {string} bookmarkDetails.category - The category to place the bookmark under.
 * @returns {Promise<AddBookmarkResponse>} A promise that resolves with the response after adding the bookmark.
 */
export async function bookmarkToProjectLibrary(
  { virtualLabId, projectId }: WorkspaceContext,
  { entity_id, category }: BookmarkRequest
): Promise<AddBookmarkResponse> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/projects/${projectId}/bookmarks`;

  return await api.post<AddBookmarkResponse>(url, {
    body: {
      entity_id,
      category,
    },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
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
  { category }: { category?: TExtendedEntitiesTypeDict }
): Promise<VlmGetProjectBookmarksResponse> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/projects/${projectId}/bookmarks`;
  return await api.get<VlmGetProjectBookmarksResponse>(url, {
    queryParams: { category },
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

/**
 * Retrieves the bookmark categories for a specific project within a virtual lab.
 *
 * @param context - The workspace context containing `virtualLabId` and `projectId`.
 * @param params - An object containing an array of bookmark requests.
 * @returns A promise that resolves to the project's library categories.
 *
 * @remarks
 * This function sends a GET request to the virtual lab API to fetch the categories
 * associated with the provided bookmarks for the specified project.
 */
export async function getProjectBookmarkCategories({
  virtualLabId,
  projectId,
}: WorkspaceContext): Promise<VlmGetProjectLibraryCategories> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/projects/${projectId}/bookmarks/categories`;
  return await api.get<VlmGetProjectLibraryCategories>(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

/**
 * Retrieves paginated project bookmarks for a specific category within a virtual lab.
 *
 * @param context - Contains the `virtualLabId` and `projectId` to identify the workspace and project.
 * @param category - The entity type category for which bookmarks are requested.
 * @param pagination - Pagination options including `page` and `page_size`.
 * @returns A promise resolving to the project library bookmarks per category.
 */
export async function getProjectBookmarksPerCategory({
  context: { virtualLabId, projectId },
  category,
  pagination,
}: {
  context: WorkspaceContext;
  category: TEntityTypeDict;
  pagination: {
    page: number;
    page_size: number;
  };
}): Promise<VlmGetProjectLibraryPerCategory> {
  const api = await virtualLabRootApi();
  const url = `${baseUri}/${virtualLabId}/projects/${projectId}/bookmarks/paginated`;

  return await api.get<VlmGetProjectLibraryPerCategory>(url, {
    queryParams: {
      category,
      page: pagination.page,
      pag_size: pagination.page_size,
    },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}
