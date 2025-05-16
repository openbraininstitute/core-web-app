import snakeCase from 'lodash/snakeCase';

import { EntityTypeValue } from '@/api/entitycore/types';
import createDownloadTicket from '@/api/entity-download';

export async function downloadArchive(entityType: EntityTypeValue, entityIds: string[]) {
  const { ticketId } = await createDownloadTicket({ entityType, entityIds });

  const url = `/api/entity-download/${snakeCase(entityType)}/ticket/${ticketId}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = '';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
