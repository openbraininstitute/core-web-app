import type { TEntityTypeDict } from '@/api/entitycore/types';

type CreateAssetFolderTicketResponse = {
  ticketId: string;
};

export async function createAssetFolderDownloadTicket({
  entityType,
  entityId,
  assetId,
  prefix,
  filename,
  virtualLabId,
  projectId,
}: {
  entityType: TEntityTypeDict;
  entityId: string;
  assetId: string;
  prefix: string;
  filename: string;
  virtualLabId?: string;
  projectId?: string;
}): Promise<CreateAssetFolderTicketResponse> {
  const url = `${window.location.origin}/api/entity-download/asset-folder/ticket`;
  const response = await fetch(url, {
    method: 'post',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entityType,
      entityId,
      assetId,
      prefix,
      filename,
      virtualLabId,
      projectId,
    }),
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
