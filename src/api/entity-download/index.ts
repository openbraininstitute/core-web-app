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
}: {
  entityType: TEntityTypeDict;
  virtualLabId?: string;
  projectId?: string;
  entityIds: string[];
}): Promise<CreateTicketResponse> {
  const url = `${window.location.origin}/api/entity-download/${kebabCase(entityType)}/ticket`;
  const downloadTicketRequest = {
    virtualLabId,
    projectId,
    entityIds,
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
