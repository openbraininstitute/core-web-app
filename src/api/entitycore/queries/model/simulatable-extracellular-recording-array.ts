import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ISimulatableExtracellularRecordingArray,
  ISimulatableExtracellularRecordingArrayFilter,
} from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/simulatable-extracellular-recording-array';

/**
 * Retrieves a list of simulatable extracellular recording arrays from the Entity Core API.
 *
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the query.
 * @param params.context - Optional workspace context for the API request.
 * @returns A promise that resolves to the paginated list response.
 */
export async function getSimulatableExtracellularRecordingArrays({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ISimulatableExtracellularRecordingArrayFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISimulatableExtracellularRecordingArray>>(baseUri, {
    queryParams: compactRecord({
      ...filters,
      with_facets: withFacets,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a single simulatable extracellular recording array by id from the Entity Core API.
 *
 * @param params.id - The unique identifier of the recording array to retrieve.
 * @param params.context - Optional workspace context for the API request.
 * @returns A promise that resolves to the entity.
 */
export async function getSimulatableExtracellularRecordingArray({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISimulatableExtracellularRecordingArray>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
