import { entityAssetsPath, entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { logWarn } from '@/utils/logger';

import type {
  IResearchLog,
  TResearchLogCreate,
  TResearchLogFilter,
  TResearchLogUpdate,
} from '@/api/entitycore/types/entities/research-log';
import type { DirectoryListContent, IAsset } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/research-log';
const ENTITY_TYPE = 'research_log';
export const RESEARCH_LOG_DOCUMENT_LABEL = 'research_log_document';
export const RESEARCH_LOG_FILES_LABEL = 'research_log_files';

const jsonHeaders = (ctx?: WorkspaceContext | null) => ({
  accept: 'application/json',
  'content-type': 'application/json',
  ...getEntityCoreContext(ctx).headers,
});

export async function getResearchLogs({
  filters,
  context,
}: {
  filters?: TResearchLogFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IResearchLog>>(baseUri, {
    queryParams: { ...filters },
    headers: jsonHeaders(context),
  });
}

export async function getResearchLog({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IResearchLog>(`${baseUri}/${id}`, { headers: jsonHeaders(context) });
}

export async function createResearchLog({
  payload,
  context,
}: {
  payload: TResearchLogCreate;
  context: WorkspaceContext;
}) {
  const api = await entityCoreApi();
  return await api.post<IResearchLog>(baseUri, { headers: jsonHeaders(context), body: payload });
}

export async function updateResearchLog({
  id,
  payload,
  context,
}: {
  id: string;
  payload: TResearchLogUpdate;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<IResearchLog>(`${baseUri}/${id}`, {
    headers: jsonHeaders(context),
    body: payload,
  });
}

export async function deleteResearchLog({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.delete<void>(`${baseUri}/${id}`, { headers: jsonHeaders(context) });
}

/** Reads the markdown of the log's document asset. */
export async function downloadResearchLogDocument({
  logId,
  assetId,
  context,
  signal,
}: {
  logId: string;
  assetId: string;
  context?: WorkspaceContext | null;
  signal?: AbortSignal;
}): Promise<string> {
  const api = await entityCoreApi();
  const response = await api.get<Response>(
    `${entityAssetsPath(ENTITY_TYPE, logId)}/${assetId}/download`,
    { headers: getEntityCoreContext(context).headers, signal },
    { asRawResponse: true, retryOnError: false }
  );
  return await response.text();
}

/** Reads one file of the log's `research_log_files` folder as text. */
export async function downloadResearchLogFile({
  logId,
  filesAssetId,
  path,
  context,
  signal,
}: {
  logId: string;
  filesAssetId: string;
  path: string;
  context?: WorkspaceContext | null;
  signal?: AbortSignal;
}): Promise<string> {
  const api = await entityCoreApi();
  const response = await api.get<Response>(
    `${entityAssetsPath(ENTITY_TYPE, logId)}/${filesAssetId}/download`,
    {
      headers: getEntityCoreContext(context).headers,
      queryParams: { asset_path: path },
      signal,
    },
    { asRawResponse: true, retryOnError: false }
  );
  return await response.text();
}

/**
 * Stores new markdown as the log's document. Assets cannot be overwritten and a path can only
 * be used once, so the new file gets a name of its own and the previous document is deleted
 * once the upload has succeeded: a failed save never loses the old text.
 */
export async function saveResearchLogDocument({
  logId,
  markdown,
  previousAssetId,
  context,
}: {
  logId: string;
  markdown: string;
  previousAssetId?: string;
  context?: WorkspaceContext | null;
}): Promise<IAsset> {
  const api = await entityCoreApi();
  const form = new FormData();
  form.append('file', new File([markdown], `logbook-${Date.now()}.md`, { type: 'text/markdown' }));
  form.append('label', RESEARCH_LOG_DOCUMENT_LABEL);
  const created = await api.post<IAsset>(entityAssetsPath(ENTITY_TYPE, logId), {
    headers: { ...getEntityCoreContext(context).headers, 'Content-Type': undefined },
    body: form,
  });
  if (previousAssetId) {
    // only the log's creator and project admins may delete; for anyone else the old document
    // stays, and the newer one is still the one read (getResearchLogDocument)
    await api
      .delete<void>(`${entityAssetsPath(ENTITY_TYPE, logId)}/${previousAssetId}`, {
        headers: getEntityCoreContext(context).headers,
      })
      .catch((e) => logWarn('Kept the previous research log document:', e));
  }
  return created;
}

/** The paths of the files in the log's `research_log_files` folder. */
export async function listResearchLogFiles({
  logId,
  filesAssetId,
  context,
}: {
  logId: string;
  filesAssetId: string;
  context?: WorkspaceContext | null;
}): Promise<string[]> {
  const api = await entityCoreApi();
  const list = await api.get<DirectoryListContent>(
    `${entityAssetsPath(ENTITY_TYPE, logId)}/${filesAssetId}/list`,
    { headers: jsonHeaders(context) },
    { retryOnError: false }
  );
  return Object.keys(list.files);
}

/** One presigned PUT. Plain fetch: the URL authorizes itself and must not get our token. */
async function putFile(url: string, body: Blob) {
  const response = await fetch(url, { method: 'PUT', body });
  if (!response.ok) throw new Error(`Uploading a file failed with status ${response.status}`);
}

/**
 * Stores `pages` (path to markdown) in the log's files folder.
 *
 * A directory asset cannot take another file, and an asset path is used once, so this makes a
 * new folder holding the old files and the pages, then deletes the old one. The old folder goes
 * only after every file is up: a failed save leaves it as it was and removes the half-made one.
 * The files carry over one at a time, as a folder may hold large figures.
 *
 * @returns the new folder's asset, whose id the log's links now read through
 */
export async function rewriteResearchLogFiles({
  logId,
  previousAssetId,
  pages,
  context,
}: {
  logId: string;
  previousAssetId?: string;
  pages: Record<string, string>;
  context?: WorkspaceContext | null;
}): Promise<IAsset> {
  const api = await entityCoreApi();
  const base = entityAssetsPath(ENTITY_TYPE, logId);
  const headers = getEntityCoreContext(context).headers;

  const existing = previousAssetId
    ? await listResearchLogFiles({ logId, filesAssetId: previousAssetId, context })
    : [];
  const kept = existing.filter((path) => !(path in pages));

  const { asset, files } = await api.post<{ asset: IAsset; files: Record<string, string> }>(
    `${base}/directory/upload`,
    {
      headers: jsonHeaders(context),
      body: {
        directory_name: `files-${Date.now()}`,
        files: [...kept, ...Object.keys(pages)],
        label: RESEARCH_LOG_FILES_LABEL,
      },
    }
  );

  try {
    for (const path of kept) {
      const response = await api.get<Response>(
        `${base}/${previousAssetId}/download`,
        { headers, queryParams: { asset_path: path } },
        { asRawResponse: true, retryOnError: false }
      );
      await putFile(files[path], await response.blob());
    }
    for (const [path, text] of Object.entries(pages)) {
      await putFile(files[path], new Blob([text], { type: 'text/markdown' }));
    }
  } catch (error) {
    await api.delete<void>(`${base}/${asset.id}`, { headers }).catch(() => undefined);
    throw error;
  }

  if (previousAssetId) await api.delete<void>(`${base}/${previousAssetId}`, { headers });
  return asset;
}
