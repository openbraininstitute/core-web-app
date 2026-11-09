import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { EntityExpandParam } from '@/api/entitycore/types/entities/derivation';
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
  expand,
}: {
  id: string;
  context?: WorkspaceContext | null;
  expand?: ReadonlyArray<EntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<ISimulationResult>(`${baseUri}/${id}`, {
    queryParams: { expand },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
