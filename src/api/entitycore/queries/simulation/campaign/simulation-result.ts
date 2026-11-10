import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { TAnyEntityExpandParam } from '@/api/entitycore/types/shared/expand';
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
  expand?: ReadonlyArray<TAnyEntityExpandParam>;
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
