import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { IResearchLog, TResearchLogDraft } from '@/api/entitycore/types/entities/research-log';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/research-log';
const JSON_BODY = { 'content-type': 'application/json' };

export async function getResearchLogs({
  context,
  queryParams,
  signal,
}: {
  context: WorkspaceContext;
  queryParams: Record<string, string>;
  signal?: AbortSignal;
}) {
  const api = await entityCoreApi();
  return api.get<EntityCoreResponse<IResearchLog>>(baseUri, {
    headers: getEntityCoreContext(context).headers,
    queryParams,
    signal,
  });
}

export async function getResearchLog({
  id,
  context,
  signal,
}: {
  id: string;
  context: WorkspaceContext;
  signal?: AbortSignal;
}) {
  const api = await entityCoreApi();
  return api.get<IResearchLog>(`${baseUri}/${id}`, {
    headers: getEntityCoreContext(context).headers,
    signal,
  });
}

export async function createResearchLog({
  context,
  draft,
}: {
  context: WorkspaceContext;
  draft: TResearchLogDraft;
}) {
  const api = await entityCoreApi();
  return api.post<IResearchLog>(baseUri, {
    headers: { ...JSON_BODY, ...getEntityCoreContext(context).headers },
    body: draft,
  });
}

export async function updateResearchLog({
  id,
  context,
  patch,
}: {
  id: string;
  context: WorkspaceContext;
  patch: Partial<TResearchLogDraft>;
}) {
  const api = await entityCoreApi();
  return api.patch<IResearchLog>(`${baseUri}/${id}`, {
    headers: { ...JSON_BODY, ...getEntityCoreContext(context).headers },
    body: patch,
  });
}
