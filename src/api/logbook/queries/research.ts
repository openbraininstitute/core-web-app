import { getEntityCoreContext } from '@/api/entitycore/utils';
import { logbookApi } from '@/api/logbook/utils';

import type {
  IActivityPage,
  IResearch,
  IResearchContributors,
  IUploadAnswer,
  IUploadRequest,
} from '@/api/logbook/types';
import type { WorkspaceContext } from '@/types/common';

const JSON_BODY = { 'content-type': 'application/json' };

/** A research log's anchor on the server, with its pages in order. */
export async function getResearch({
  id,
  context,
  signal,
}: {
  id: string;
  context: WorkspaceContext;
  signal?: AbortSignal;
}) {
  const api = await logbookApi();
  return api.get<IResearch>(`/research/${id}`, {
    headers: getEntityCoreContext(context).headers,
    signal,
  });
}

/**
 * Deletes a research log everywhere: the server deletes the EntityCore record (as this person),
 * then its own pages, text and history. Safe to send again after a failure.
 */
export async function deleteResearch({ id, context }: { id: string; context: WorkspaceContext }) {
  const api = await logbookApi();
  return api.delete<void>(`/research/${id}`, { headers: getEntityCoreContext(context).headers });
}

/** One page of a log's saved activity, newest first, up to `until`; `after` is the cursor. */
export async function getResearchActivity({
  id,
  context,
  until,
  after,
  signal,
}: {
  id: string;
  context: WorkspaceContext;
  until: string;
  after: string | null;
  signal?: AbortSignal;
}) {
  const api = await logbookApi();
  return api.get<IActivityPage>(`/research/${id}/activity`, {
    headers: getEntityCoreContext(context).headers,
    queryParams: { until, after },
    signal,
  });
}

/** Who wrote in each log; the server answers only logs anchored in this project. */
export async function getResearchContributors({
  ids,
  context,
  signal,
}: {
  ids: ReadonlyArray<string>;
  context: WorkspaceContext;
  signal?: AbortSignal;
}) {
  const api = await logbookApi();
  return api.get<IResearchContributors>('/research/contribution', {
    headers: getEntityCoreContext(context).headers,
    queryParams: { ids: ids.join(',') },
    signal,
  });
}

/**
 * Asks the server to save one file in the log: it finds or makes the log's files folder and signs
 * a PUT for these bytes under their saved name.
 */
export async function createResearchUpload({
  id,
  context,
  file,
}: {
  id: string;
  context: WorkspaceContext;
  file: IUploadRequest;
}) {
  const api = await logbookApi();
  return api.post<IUploadAnswer>(`/research/${id}/upload`, {
    headers: { ...JSON_BODY, ...getEntityCoreContext(context).headers },
    body: file,
  });
}
