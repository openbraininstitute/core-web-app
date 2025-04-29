import authApiClient from '@/api/apiClient';

import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { EntityCoreDataType, IAsset } from '@/api/entitycore/types/shared/global';
import { entityCoreUrl } from '@/config';

/**
 * Retrieves assets for a specific entity from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.entityType - The type of the entity to retrieve
 * @param {string} params.entityId - The id of the entity to retrieve
 * @returns {Promise<EntityCoreResponse<IAsset>>} A promise that resolves to the list of assets
 */
export async function getAssets({
  entityType,
  entityId,
}: {
  entityType: EntityCoreDataType;
  entityId: string;
}): Promise<EntityCoreResponse<IAsset>> {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<EntityCoreResponse<IAsset>>(`/${entityType}/${entityId}/assets`, {
    ...getEntityCoreContext(),
  });
}

/**
 * Retrieves a specific asset (metadata) by its id from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.entityType - The type of the entity to retrieve
 * @param {string} params.entityId - The id of the entity to retrieve
 * @param {string} params.id - The id of the asset to retrieve
 * @returns {Promise<IAsset>} A promise that resolves to the requested asset
 */
export async function getAsset({
  entityType,
  entityId,
  id,
}: {
  entityType: EntityCoreDataType;
  entityId: string;
  id: string;
}) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<IAsset>(`/${entityType}/${entityId}/assets/${id}`, {
    ...getEntityCoreContext(),
  });
}

/**
 * Downloads a specific asset by its id from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.entityType - The type of the entity to retrieve
 * @param {string} params.entityId - The id of the entity to retrieve
 * @param {string} params.id - The id of the asset to retrieve
 * @returns {Promise<Response>} A promise that resolves to the response from the API
 */
export async function downloadAsset({
  entityType,
  entityId,
  id,
}: {
  entityType: EntityCoreDataType;
  entityId: string;
  id: string;
}) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<ArrayBuffer>(`/${entityType}/${entityId}/assets/${id}/download`, {
    ...getEntityCoreContext(),
  });
}
