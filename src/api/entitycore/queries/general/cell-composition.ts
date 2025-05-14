import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  ICellCompositionOntologyRoot,
  ICellCompositionRoot,
} from '@/api/entitycore/types/entities/cell-composition';
import type { WorkspaceContext } from '@/types/common';
import { sleep } from '@/utils/promise';

const baseUri = '/cell-composition';

/**
 * Retrieves the cell composition data from the Entity Core API.
 *
 * @param ctx - The workspace context containing authentication and environment information.
 * @returns A promise that resolves to the cell composition root object.
 *
 * @remarks
 * The result is cached with a cache name of 'cell-composition' for 24 hours (86,400 seconds).
 */
export async function getCellCompositionSummary(ctx?: WorkspaceContext) {
  const api = await entityCoreApi();
  // await sleep(30000);
  return await api.get<ICellCompositionRoot>(
    `${baseUri}`,
    { ...getEntityCoreContext(ctx) },
    {
      cache: { cacheName: 'cell-composition-summary', enabled: true, ttlInSeconds: 86_400 },
    }
  );
}

export async function getCellCompositionVolume(ctx?: WorkspaceContext) {
  const api = await entityCoreApi();
  return await api.get<ICellCompositionOntologyRoot>(
    `${baseUri}/volume`,
    { ...getEntityCoreContext(ctx) },
    {
      cache: { cacheName: 'cell-composition-volume', enabled: true, ttlInSeconds: 86_400 },
    }
  );
}
