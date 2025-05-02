import authApiClient from '@/api/apiClient';

import { getEntityCoreContext } from '@/api/entitycore/utils';
import { entityCoreUrl } from '@/config';

import type { EntityCoreDataType, IAsset } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

/**
 * Retrieves assets for a specific entity from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.entityType - The type of the entity to retrieve
 * @param {string} params.entityId - The id of the entity to retrieve
 * @returns {Promise<EntityCoreResponse<IAsset>>} A promise that resolves to the list of assets
 */
export async function getAssets({
  ctx,
  entityType,
  entityId,
}: {
  entityType: EntityCoreDataType;
  entityId: string;
  ctx?: WorkspaceContext;
}): Promise<EntityCoreResponse<IAsset>> {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<EntityCoreResponse<IAsset>>(`/${entityType}/${entityId}/assets`, {
    ...getEntityCoreContext(ctx),
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
  ctx,
  entityType,
  entityId,
  id,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  id: string;
}) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<IAsset>(`/${entityType}/${entityId}/assets/${id}`, {
    ...getEntityCoreContext(ctx),
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
  ctx,
  entityType,
  entityId,
  id,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  id: string;
}) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<ArrayBuffer>(`/${entityType}/${entityId}/assets/${id}/download`, {
    ...getEntityCoreContext(ctx),
  });
}
