import snakeCase from 'lodash/snakeCase';

import { TEntityTypeDict } from '@/api/entitycore/types';
import createDownloadTicket from '@/api/entity-download';
import { WorkspaceContext } from '@/types/common';

export async function downloadArchive(
  entityType: TEntityTypeDict,
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const { ticketId } = await createDownloadTicket({ entityType, entityIds, ...ctx });

  const url = `/api/entity-download/${snakeCase(entityType)}/ticket/${ticketId}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = '';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
