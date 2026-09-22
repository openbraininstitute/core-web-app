import kebabCase from 'es-toolkit/compat/kebabCase';

import type { TEntityTypeDict } from '@/api/entitycore/types';

type CreateTicketResponse = {
  ticketId: string;
};

/**
 * POSTs a download-ticket request and returns the ticket id.
 *
 * @throws {Error} With the route's own message — `statusText` is empty over HTTP/2, so it is never
 * used.
 */
export async function requestDownloadTicket(
  url: string,
  body: unknown
): Promise<CreateTicketResponse> {
  const response = await fetch(url, {
    method: 'post',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.ok) return response.json();

  const failure = await response.json().catch(() => null);
  throw new Error(failure?.error || `Download could not be prepared (error ${response.status}).`);
}

export default async function createDownloadTicket({
  entityType,
  virtualLabId,
  projectId,
  entityIds,
  name,
}: {
  entityType: TEntityTypeDict;
  virtualLabId?: string;
  projectId?: string;
  entityIds: string[];
  /** name of the single selected entity; names the archive when present */
  name?: string | null;
}): Promise<CreateTicketResponse> {
  return requestDownloadTicket(
    `${window.location.origin}/api/entity-download/${kebabCase(entityType)}/ticket`,
    { virtualLabId, projectId, entityIds, name }
  );
}
