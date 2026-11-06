import { entityAssetsPath, entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IResearchLog,
  TResearchLogCreate,
  TResearchLogFilter,
  TResearchLogUpdate,
} from '@/api/entitycore/types/entities/research-log';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/research-log';
const ENTITY_TYPE = 'research_log';
export const RESEARCH_LOG_DOCUMENT_LABEL = 'research_log_document';

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
  form.append(
    'file',
    new File([markdown], `logbook-${Date.now()}.md`, { type: 'text/markdown' })
  );
  form.append('label', RESEARCH_LOG_DOCUMENT_LABEL);
  const created = await api.post<IAsset>(entityAssetsPath(ENTITY_TYPE, logId), {
    headers: { ...getEntityCoreContext(context).headers, 'Content-Type': undefined },
    body: form,
  });
  if (previousAssetId) {
    await api.delete<void>(`${entityAssetsPath(ENTITY_TYPE, logId)}/${previousAssetId}`, {
      headers: getEntityCoreContext(context).headers,
    });
  }
  return created;
}
