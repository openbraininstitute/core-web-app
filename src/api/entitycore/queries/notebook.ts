import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { INotebook, NotebookFilter } from '@/api/entitycore/types/entities/notebook';
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
