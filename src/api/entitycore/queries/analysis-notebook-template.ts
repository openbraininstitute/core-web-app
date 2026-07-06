import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IAnalysisNotebookTemplate,
  TAnalysisNotebookTemplateFilter,
} from '@/api/entitycore/types/entities/analysis-notebook-template';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/analysis-notebook-template';

/**
 * Retrieves a list of notebooks from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {TAnalysisNotebookTemplateFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IAnalysisNotebookTemplate>>} A promise that resolves to the list of notebooks
 */
export async function getAnalysisNotebookTemplates({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: TAnalysisNotebookTemplateFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IAnalysisNotebookTemplate>>(baseUri, {
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
 * @returns {Promise<IAnalysisNotebookTemplate>} A promise that resolves to the requested notebook
 */
export async function getAnalysisNotebookTemplate({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IAnalysisNotebookTemplate>(`${baseUri}/${id}`, {
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
export async function deleteAnalysisNotebookTemplate({
  id,
  context,
}: {
  id: string;
  context: WorkspaceContext;
}) {
  const api = await entityCoreApi();
  return await api.delete<void>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
