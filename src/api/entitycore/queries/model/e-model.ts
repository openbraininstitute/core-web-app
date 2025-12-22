import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { IEModelFilter, IEModel } from '@/api/entitycore/types/entities/e-model';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/emodel';
/**
 * Retrieves a list of e-models from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {IEModelFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IEModel>>} A promise that resolves to the list of e-models
 */
export async function getEModels({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: IEModelFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IEModel>>(baseUri, {
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
 * Retrieves a specific e-model by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the emodel to retrieve
 * @returns {Promise<IEModel>} A promise that resolves to the requested emodel
 */
export async function getEModel({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IEModel>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
