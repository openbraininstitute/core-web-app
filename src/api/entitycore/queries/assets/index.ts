import { kebabCase } from 'es-toolkit/compat';

import { authApiClient } from '@/api/api-client';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { config } from '@/config';
import { compactRecord } from '@/utils/dictionary';

import type { CacheConfiguration } from '@/api/cache-storage';
import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type {
  AssetLabel,
  DirectoryListContent,
  EntityCoreDataType,
  IAsset,
} from '@/api/entitycore/types/shared/global';
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
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<EntityCoreResponse<IAsset>>(`/${kebabCase(entityType)}/${entityId}/assets`, {
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
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<IAsset>(`/${entityType}/${entityId}/assets/${id}`, {
    ...getEntityCoreContext(ctx),
  });
}

export async function downloadAsset(params: {
  ctx?: WorkspaceContext | null;
  entityType: TEntityTypeDict;
  entityId: string;
  assetPath?: string;
  id: string;
  asRawResponse: true;
  retryOnError?: boolean;
  signal?: AbortSignal;
  cache?: CacheConfiguration;
}): Promise<Response>;

export async function downloadAsset<T>(params: {
  ctx?: WorkspaceContext;
  entityType: TEntityTypeDict;
  entityId: string;
  assetPath?: string;
  id: string;
  asRawResponse?: false;
  retryOnError?: boolean;
  signal?: AbortSignal;
  cache?: CacheConfiguration;
}): Promise<T>;

/**
 * Downloads a specific asset by its id from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.entityType - The type of the entity to retrieve
 * @param {string} params.entityId - The id of the entity to retrieve
 * @param {string} params.id - The id of the asset to retrieve
 * @returns {Promise<Response>} A promise that resolves to the response from the API
 */
export async function downloadAsset<T>({
  ctx,
  entityType,
  entityId,
  id,
  asRawResponse = false,
  retryOnError = false,
  assetPath = '',
  signal,
  cache,
}: {
  ctx?: WorkspaceContext | null;
  entityType: TEntityTypeDict;
  entityId: string;
  assetPath?: string;
  id: string;
  asRawResponse?: boolean;
  retryOnError?: boolean;
  signal?: AbortSignal;
  cache?: CacheConfiguration;
}): Promise<T | Response> {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<T>(
    `/${kebabCase(entityType)}/${entityId}/assets/${id}/download`,
    {
      ...getEntityCoreContext(ctx),
      queryParams: compactRecord({ asset_path: assetPath }),
      signal,
    },
    { asRawResponse, retryOnError, cache }
  );
}

/**
 * Creates a JSON asset by converting a payload into a JSON file and uploading it using FormData.
 *
 * @param options - The options for creating the JSON asset
 * @param {WorkspaceContext} [options.ctx] - Optional workspace context
 * @param {EntityCoreDataType} options.entityType - The type of entity
 * @param {string} options.entityId - The ID of the entity
 * @param {string} options.path - The path where the JSON file will be stored
 * @param {Record<string, any>} options.payload - The data to be converted to JSON
 * @param {Record<string, any>} [options.meta] - Optional metadata to be included with the asset
 *
 * @returns {Promise<IAsset>} A promise that resolves to the created asset
 *
 * @throws Will throw an error if the API request fails
 */
export async function createJsonAsset({
  ctx,
  entityType,
  entityId,
  path,
  payload,
  meta,
  label,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  path: string;
  payload: Record<string, any>;
  meta?: Record<string, any>;
  label?: AssetLabel;
}): Promise<IAsset> {
  const stringified = JSON.stringify(payload);
  const jsonBlob = new Blob([stringified], { type: 'application/json' });
  const jsonFile = new File([jsonBlob], `${path}.json`, {
    type: 'application/json',
  });
  const formData = new FormData();

  if (jsonFile) formData.append('file', jsonFile);
  if (label) formData.append('label', label);
  if (meta) formData.append('meta', JSON.stringify(meta));
  if (label) formData.append('label', label);

  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.post<IAsset>(`/${kebabCase(entityType)}/${entityId}/assets`, {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      // This is required due apiClient is using "application/json" as default content-type
      // the browser should handle auto the multipart-form
      'Content-Type': undefined,
    },
    body: formData,
  });
}

/**
 * Lists the contents of a directory of assets by its id from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.entityType - The type of the entity to retrieve
 * @param {string} params.entityId - The id of the entity to retrieve
 * @param {string} params.id - The id of the asset to retrieve
 * @returns {Promise<Response>} A promise that resolves to the response from the API
 */
export async function listDirectoryOfAssets({
  ctx,
  entityType,
  entityId,
  id,
  retryOnError = false,
}: {
  ctx?: WorkspaceContext;
  entityType: TEntityTypeDict;
  entityId: string;
  id: string;
  retryOnError?: boolean;
}): Promise<DirectoryListContent> {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<DirectoryListContent>(
    `/${kebabCase(entityType)}/${entityId}/assets/${id}/list`,
    {
      headers: {
        ...getEntityCoreContext(ctx).headers,
        accept: 'application/json',
        'content-type': 'application/json',
      },
    },
    { retryOnError }
  );
}

export async function createAsset({
  ctx,
  entityType,
  entityId,
  fileName,
  payload,
  meta,
  label,
  mimeType,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  fileName: string;
  mimeType: string;
  payload: BlobPart;
  meta?: Record<string, any>;
  label?: AssetLabel;
}): Promise<IAsset> {
  const blob = new Blob([payload], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  const formData = new FormData();

  if (file) formData.append('file', file);
  if (label) formData.append('label', label);
  if (meta) formData.append('meta', JSON.stringify(meta));

  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.post<IAsset>(`/${kebabCase(entityType)}/${entityId}/assets`, {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      // This is required due apiClient is using "application/json" as default content-type
      // the browser should handle auto the multipart-form
      'Content-Type': undefined,
    },
    body: formData,
  });
}
