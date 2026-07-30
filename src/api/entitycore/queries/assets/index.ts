import { authApiClient } from '@/api/api-client';
import {
  MULTIPART_UPLOAD_THRESHOLD,
  uploadAssetMultipart,
} from '@/api/entitycore/queries/assets/multipart';
import { entityAssetsPath, getEntityCoreContext } from '@/api/entitycore/utils';
import { getSession } from '@/auth-fetch';
import { config } from '@/config';
import { compactRecord } from '@/utils/dictionary';

import type { CacheConfiguration } from '@/api/cache-storage';
import type { IUploadProgress } from '@/api/entitycore/queries/assets/multipart';
import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type {
  AssetLabel,
  DirectoryListContent,
  EntityCoreDataType,
  IAsset,
} from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

export {
  completeMultipartUpload,
  deleteAsset,
  initiateMultipartUpload,
  MULTIPART_UPLOAD_THRESHOLD,
  uploadAssetMultipart,
} from '@/api/entitycore/queries/assets/multipart';

export type {
  IMultipartUploadInitiatePayload,
  IUploadProgress,
} from '@/api/entitycore/queries/assets/multipart';

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
  return await api.get<EntityCoreResponse<IAsset>>(entityAssetsPath(entityType, entityId), {
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

/**
 * Resolves the URL + headers needed to download a specific asset, without performing the request.
 * Useful for handing the request off to environments outside the main `ApiClient` flow (e.g. a Web
 * Worker that streams the response body into `CacheStorage`).
 */
export async function buildAssetDownloadRequest({
  ctx,
  entityType,
  entityId,
  id,
  assetPath = '',
}: {
  ctx?: WorkspaceContext | null;
  entityType: TEntityTypeDict;
  entityId: string;
  id: string;
  assetPath?: string;
}): Promise<{ url: string; headers: Record<string, string> }> {
  const session = await getSession();
  const url = new URL(
    `${config.ENTITY_CORE_URL}${entityAssetsPath(entityType, entityId)}/${id}/download`
  );
  if (assetPath) url.searchParams.append('asset_path', assetPath);

  const headers: Record<string, string> = {};
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  const ctxHeaders = getEntityCoreContext(ctx).headers;
  if (ctxHeaders) Object.assign(headers, ctxHeaders);

  return { url: url.toString(), headers };
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
    `${entityAssetsPath(entityType, entityId)}/${id}/download`,
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

  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.post<IAsset>(entityAssetsPath(entityType, entityId), {
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
    `${entityAssetsPath(entityType, entityId)}/${id}/list`,
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

/**
 * Uploads a file asset. Files at or above `MULTIPART_UPLOAD_THRESHOLD` go through the
 * S3 multipart flow (parallel presigned part uploads with retries); smaller files are
 * posted directly as multipart/form-data.
 */
export async function createAsset({
  ctx,
  entityType,
  entityId,
  fileName,
  payload,
  meta,
  label,
  mimeType,
  onProgress,
  signal,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  fileName: string;
  mimeType: string;
  payload: BlobPart;
  meta?: Record<string, any>;
  label?: AssetLabel;
  /** Only reported by the multipart flow, i.e. for files at or above the threshold. */
  onProgress?: (progress: IUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<IAsset> {
  const file = new File([payload], fileName, { type: mimeType });
  const thresholdMb = MULTIPART_UPLOAD_THRESHOLD / (1024 * 1024);

  if (file.size >= MULTIPART_UPLOAD_THRESHOLD) {
    if (!label) {
      throw new Error(
        `Uploading ${fileName}: files of ${thresholdMb}MB and above require an asset label`
      );
    }
    if (meta) {
      throw new Error(
        `Uploading ${fileName}: meta is not supported for files of ${thresholdMb}MB and above ` +
          '(the multipart initiate endpoint does not accept it)'
      );
    }
    return uploadAssetMultipart({ ctx, entityType, entityId, file, label, onProgress, signal });
  }

  const formData = new FormData();

  if (file) formData.append('file', file);
  if (label) formData.append('label', label);
  if (meta) formData.append('meta', JSON.stringify(meta));

  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.post<IAsset>(entityAssetsPath(entityType, entityId), {
    headers: {
      ...getEntityCoreContext(ctx).headers,
      // This is required due apiClient is using "application/json" as default content-type
      // the browser should handle auto the multipart-form
      'Content-Type': undefined,
    },
    body: formData,
    signal,
  });
}
