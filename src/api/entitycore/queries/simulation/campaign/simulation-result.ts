import { toExpandQueryParam } from '@/api/entitycore/types/shared/expand';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { EntityExpandParam } from '@/api/entitycore/types/shared/expand';
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
  /** entitycore `expand` values, sent as repeated `expand=` params. */
  expand?: ReadonlyArray<EntityExpandParam>;
}) {
  const api = await entityCoreApi();
  return await api.get<ISimulationResult>(`${baseUri}/${id}`, {
    queryParams: { expand: toExpandQueryParam(expand) },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
