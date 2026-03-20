import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IonChannelModel,
  IonChannelModelFilter,
} from '@/api/entitycore/types/entities/ion-channel';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/ion-channel-model';
/**
 * Retrieves a list of ion channel models from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {IonChannelModelFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IonChannelModel>>} A promise that resolves to the list of ion channel models
 */
export async function getIonChannelModels({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: IonChannelModelFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IonChannelModel>>(baseUri, {
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
 * Retrieves a specific ion-channel-model by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the emodel to retrieve
 * @returns {Promise<IonChannelModel>} A promise that resolves to the requested emodel
 */
export async function getIonChannelModel({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IonChannelModel>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
