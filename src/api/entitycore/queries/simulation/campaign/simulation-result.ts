import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/simulation-result';

/**
 * Retrieves a specific circuit simulation result by its ID from the EntityCoreAPI.
 *
 *
 */
export async function getSimulationResult({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISimulationResult>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
