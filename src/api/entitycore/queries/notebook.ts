import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { INotebook, NotebookFilter } from '@/api/entitycore/types/entities/notebook';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/analysis-notebook-template';

/**
 * Retrieves a list of notebooks from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {NotebookFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<INotebook>>} A promise that resolves to the list of notebooks
 */
export async function getNotebooks({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: NotebookFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<INotebook>>(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a specific notebook by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the emodel to retrieve
 * @returns {Promise<INotebook>} A promise that resolves to the requested notebook
 */
export async function getNotebook({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<INotebook>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Deletes a specific notebook by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the notebook to delete
 * @param {WorkspaceContext} params.context - The workspace context
 * @returns {Promise<void>} A promise that resolves when the notebook has been deleted
 */
export async function deleteNotebook({ id, context }: { id: string; context: WorkspaceContext }) {
  const api = await entityCoreApi();
  return await api.delete<void>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
