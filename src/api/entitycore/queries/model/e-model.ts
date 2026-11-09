import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { EntityExpandParam } from '@/api/entitycore/types/entities/derivation';
import type { IEModel, IEModelFilter } from '@/api/entitycore/types/entities/e-model';
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
  expand,
}: {
  withFacets?: boolean;
  filters?: IEModelFilter;
  context?: WorkspaceContext | null;
  expand?: ReadonlyArray<EntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IEModel>>(baseUri, {
    queryParams: {
      expand,
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
  expand,
}: {
  id: string;
  context?: WorkspaceContext | null;
  expand?: ReadonlyArray<EntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<IEModel>(`${baseUri}/${id}`, {
    queryParams: { expand },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
