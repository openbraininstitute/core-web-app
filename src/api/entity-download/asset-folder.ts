import type { TEntityTypeDict } from '@/api/entitycore/types';

type CreateAssetFolderTicketResponse = {
  ticketId: string;
};

type CreateAssetFolderTicketParams = {
  entityType: TEntityTypeDict;
  entityId: string;
  assetId: string;
  prefix: string;
  filename: string;
  virtualLabId?: string;
  projectId?: string;
};

export async function createAssetFolderDownloadTicket(
  params: CreateAssetFolderTicketParams
): Promise<CreateAssetFolderTicketResponse> {
  const url = `${window.location.origin}/api/entity-download/asset-folder/ticket`;
  const response = await fetch(url, {
    method: 'post',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (response.ok) {
    return response.json();
  }
  throw new Error(
    `Error #${response.status} creating asset folder download ticket: ${response.statusText}`
  );
}

export function getAssetFolderDownloadUrl(ticketId: string): string {
  return `${window.location.origin}/api/entity-download/asset-folder/ticket/${ticketId}`;
}
