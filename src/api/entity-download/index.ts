import kebabCase from 'es-toolkit/compat/kebabCase';

import type { TEntityTypeDict } from '@/api/entitycore/types';

type CreateTicketResponse = {
  ticketId: string;
};

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
  const url = `${window.location.origin}/api/entity-download/${kebabCase(entityType)}/ticket`;
  const downloadTicketRequest = {
    virtualLabId,
    projectId,
    entityIds,
    name,
  };
  const response = await fetch(url, {
    method: 'post',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(downloadTicketRequest),
  });
  if (response.ok) {
    const result = await response.json();
    return result;
  }
  throw new Error(`Error #${response.status} creating download ticket: ${response.statusText}`);
}
