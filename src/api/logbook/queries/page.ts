import { getEntityCoreContext } from '@/api/entitycore/utils';
import { JSON_BODY, logbookApi } from '@/api/logbook/utils';

import type { IPage, IWriter, TPageKind } from '@/api/logbook/types';
import type { WorkspaceContext } from '@/types/common';

/** A new page of a log. The idempotency key is made once per add, so a retry never makes two. */
export async function createPage({
  researchId,
  context,
  title,
  kind,
  idempotencyKey,
}: {
  researchId: string;
  context: WorkspaceContext;
  title: string;
  kind: TPageKind;
  idempotencyKey: string;
}) {
  const api = await logbookApi();
  return api.post<IPage>(`/research/${researchId}/page`, {
    headers: {
      ...JSON_BODY,
      ...getEntityCoreContext(context).headers,
      'idempotency-key': idempotencyKey,
    },
    body: { title, kind },
  });
}

/** Renames a page if it is still at `version` (If-Match); a newer page is refused with 412. */
export async function renamePage({
  pageId,
  context,
  version,
  title,
}: {
  pageId: string;
  context: WorkspaceContext;
  version: number;
  title: string;
}) {
  const api = await logbookApi();
  return api.patch<IPage>(`/page/${pageId}`, {
    headers: {
      ...JSON_BODY,
      ...getEntityCoreContext(context).headers,
      'if-match': String(version),
    },
    body: { title },
  });
}

/** Deletes a section for good. Safe to send again: the server finishes what the first began. */
export async function deletePage({
  pageId,
  context,
}: {
  pageId: string;
  context: WorkspaceContext;
}) {
  const api = await logbookApi();
  return api.delete<void>(`/page/${pageId}`, { headers: getEntityCoreContext(context).headers });
}

export async function getPageAuthorship({
  pageId,
  context,
  clientIds,
  signal,
}: {
  pageId: string;
  context: WorkspaceContext;
  clientIds: ReadonlyArray<number>;
  signal?: AbortSignal;
}) {
  const api = await logbookApi();
  return api.get<{ readonly items: readonly IWriter[] }>(`/page/${pageId}/authorship`, {
    headers: getEntityCoreContext(context).headers,
    queryParams: { clients: clientIds.join(',') },
    signal,
  });
}

/** A page's text as one Yjs V1 update. Page routes need no project headers. */
export async function readPageDoc(pageId: string): Promise<Uint8Array> {
  const api = await logbookApi();
  const response = await api.get<Response>(
    `/page/${encodeURIComponent(pageId)}/doc`,
    {},
    { asRawResponse: true }
  );
  return new Uint8Array(await response.arrayBuffer());
}

/** Sends a Yjs V1 update to a page; the answer (200) means it is stored in Postgres. */
export async function sendPageDoc(pageId: string, update: Uint8Array): Promise<void> {
  const api = await logbookApi();
  await api.post<void>(`/page/${encodeURIComponent(pageId)}/doc`, {
    headers: { 'content-type': 'application/octet-stream' },
    body: update,
  });
}
