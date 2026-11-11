import { requestDownloadTicket } from '@/api/entity-download';

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
  return requestDownloadTicket(
    `${window.location.origin}/api/entity-download/asset-folder/ticket`,
    params
  );
}

export function getAssetFolderDownloadUrl(ticketId: string): string {
  return `${window.location.origin}/api/entity-download/asset-folder/ticket/${ticketId}`;
}
