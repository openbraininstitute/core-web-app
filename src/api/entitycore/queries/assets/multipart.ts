import { delay } from 'es-toolkit';
import pLimit from 'p-limit';

import { authApiClient } from '@/api/api-client';
import { isAssetContentType } from '@/api/entitycore/types/shared/global';
import { entityAssetsPath, getEntityCoreContext } from '@/api/entitycore/utils';
import { ApiError } from '@/api/error';
import { config } from '@/config';
import { sha256HexOfBlob } from '@/utils/hash';

import type {
  AssetContentType,
  AssetLabel,
  EntityCoreDataType,
  IAsset,
  IAssetWithUploadMeta,
  IUploadMeta,
} from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

/** Files at or above this size are uploaded through the S3 multipart flow. */
export const MULTIPART_UPLOAD_THRESHOLD = 20 * 1024 * 1024;

/** Drives `preferred_part_count`; the server clips the final part size to its own [5MB, 5GB] bounds. */
const TARGET_PART_SIZE = 10 * 1024 * 1024;
const MAX_CONCURRENT_PART_UPLOADS = 5;
const PART_RETRY_ATTEMPTS = 3;
const PART_RETRY_BASE_DELAY_MS = 500;

export interface IUploadProgress {
  phase: 'hashing' | 'uploading';
  loadedBytes: number;
  totalBytes: number;
}

export interface IMultipartUploadInitiatePayload {
  filename: string;
  filesize: number;
  sha256_digest: string;
  content_type?: AssetContentType;
  label: AssetLabel;
  preferred_part_count?: number;
}

/**
 * Starts a multipart upload session: creates an asset in `uploading` status and returns
 * presigned S3 URLs for each part in `upload_meta`.
 */
export async function initiateMultipartUpload({
  ctx,
  entityType,
  entityId,
  payload,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  payload: IMultipartUploadInitiatePayload;
}): Promise<IAssetWithUploadMeta> {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.post<IAssetWithUploadMeta>(
    `${entityAssetsPath(entityType, entityId)}/multipart-upload/initiate`,
    {
      ...getEntityCoreContext(ctx),
      body: payload,
    }
  );
}

/**
 * Finalizes a multipart upload: the server verifies all parts landed in S3 with the expected
 * total size, assembles the file and flips the asset status to `created`.
 */
export async function completeMultipartUpload({
  ctx,
  entityType,
  entityId,
  assetId,
  signal,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  assetId: string;
  signal?: AbortSignal;
}): Promise<IAsset> {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.post<IAsset>(
    `${entityAssetsPath(entityType, entityId)}/${assetId}/multipart-upload/complete`,
    {
      ...getEntityCoreContext(ctx),
      signal,
    }
  );
}

/**
 * Deletes an asset by its id. Also the only way to cancel a multipart upload session:
 * an initiated-but-never-completed asset stays in `uploading` status until deleted.
 */
export async function deleteAsset({
  ctx,
  entityType,
  entityId,
  assetId,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  assetId: string;
}): Promise<void> {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.delete<void>(`${entityAssetsPath(entityType, entityId)}/${assetId}`, {
    ...getEntityCoreContext(ctx),
  });
}

/**
 * Uploads a file asset through the S3 multipart flow:
 * hash (sha256 is required by the initiate endpoint) → initiate → parallel part PUTs
 * to presigned URLs with per-part retries → complete.
 *
 * On abort or terminal failure after initiation, the dangling `uploading` asset is
 * deleted (best-effort) before the error is rethrown.
 */
export async function uploadAssetMultipart({
  ctx,
  entityType,
  entityId,
  file,
  label,
  onProgress,
  signal,
}: {
  ctx?: WorkspaceContext;
  entityType: EntityCoreDataType;
  entityId: string;
  file: File;
  label: AssetLabel;
  onProgress?: (progress: IUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<IAsset> {
  const totalBytes = file.size;

  onProgress?.({ phase: 'hashing', loadedBytes: 0, totalBytes });
  const sha256Digest = await sha256HexOfBlob(file, {
    signal,
    onProgress: (hashedBytes) =>
      onProgress?.({ phase: 'hashing', loadedBytes: hashedBytes, totalBytes }),
  });

  const asset = await initiateMultipartUpload({
    ctx,
    entityType,
    entityId,
    payload: {
      filename: file.name,
      filesize: totalBytes,
      sha256_digest: sha256Digest,
      // When the mime type is not a known AssetContentType, let the server deduce it
      // from the file extension instead of failing validation.
      ...(isAssetContentType(file.type) && { content_type: file.type }),
      label,
      preferred_part_count: Math.ceil(totalBytes / TARGET_PART_SIZE),
    },
  });

  try {
    const uploadMeta = asset.upload_meta;
    if (!uploadMeta?.parts.length) {
      throw new Error(`Multipart upload of ${file.name}: no presigned part URLs returned`);
    }

    await uploadParts({ file, uploadMeta, onProgress, signal });
    return await completeMultipartUpload({ ctx, entityType, entityId, assetId: asset.id, signal });
  } catch (error) {
    await deleteAsset({ ctx, entityType, entityId, assetId: asset.id }).catch(() => {});
    throw error;
  }
}

async function uploadParts({
  file,
  uploadMeta,
  onProgress,
  signal,
}: {
  file: File;
  uploadMeta: IUploadMeta;
  onProgress?: (progress: IUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const totalBytes = file.size;
  const { part_size: partSize, parts } = uploadMeta;

  // Inner controller so a single part's terminal failure cancels the other in-flight PUTs.
  const partAbort = new AbortController();
  const partSignal = signal ? AbortSignal.any([signal, partAbort.signal]) : partAbort.signal;

  onProgress?.({ phase: 'uploading', loadedBytes: 0, totalBytes });
  let uploadedBytes = 0;
  const limit = pLimit(MAX_CONCURRENT_PART_UPLOADS);

  try {
    await Promise.all(
      parts.map((part) =>
        limit(async () => {
          const start = (part.part_number - 1) * partSize;
          const chunk = file.slice(start, start + partSize);
          await uploadPartWithRetry(part.url, chunk, partSignal);
          uploadedBytes += chunk.size;
          onProgress?.({ phase: 'uploading', loadedBytes: uploadedBytes, totalBytes });
        })
      )
    );
  } catch (error) {
    partAbort.abort();
    throw error;
  }
}

async function uploadPartWithRetry(url: string, body: Blob, signal?: AbortSignal): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    signal?.throwIfAborted();

    let response: Response | null = null;
    try {
      // Plain fetch on purpose: presigned S3 URLs are self-authorizing and must not
      // receive the Authorization header the ApiClient would attach.
      response = await fetch(url, { method: 'PUT', body, signal });
    } catch (error) {
      // fetch rejects with TypeError on network failures (retryable) and with
      // an AbortError DOMException on abort (terminal).
      if (!(error instanceof TypeError)) throw error;
    }

    if (response?.ok) return;

    const retryable = response === null || response.status >= 500 || response.status === 429;
    if (!retryable || attempt >= PART_RETRY_ATTEMPTS) {
      throw new ApiError(
        `Multipart part upload failed${response ? ` with status ${response.status}` : ': network error'}`,
        { status: response?.status }
      );
    }

    await delay(
      PART_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * PART_RETRY_BASE_DELAY_MS,
      {
        signal,
      }
    );
  }
}
