import snakeCase from 'es-toolkit/compat/snakeCase';

import createDownloadTicket from '@/api/entity-download';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

/**
 * Downloads a batch of entities as one archive.
 *
 * @param entityType - Entitycore type shared by the selected entities.
 * @param entityIds - Ids to include, in selection order.
 * @param ctx - Workspace the entities are read from.
 * @param name - Name of the single selected entity; names the archive when exactly one is selected.
 */
export async function downloadArchive(
  entityType: TEntityTypeDict,
  entityIds: string[],
  ctx?: WorkspaceContext,
  name?: string | null
) {
  const { ticketId } = await createDownloadTicket({
    entityType,
    entityIds,
    name,
    ...ctx,
  });

  const url = `/api/entity-download/${snakeCase(entityType)}/ticket/${ticketId}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = '';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Notification arguments for a download that could not be started.
 *
 * @remarks `downloadArchive` cannot raise this itself — antd notifications come from `App.useApp()`,
 * so only a component can. This keeps the wording in one place until a `useDownloadArchive` hook
 * owns the pending state too.
 */
export function downloadFailedNotification(error: unknown) {
  return {
    message: 'Download failed',
    description: (error instanceof Error && error.message) || 'The download could not be started.',
    placement: 'topRight' as const,
  };
}
