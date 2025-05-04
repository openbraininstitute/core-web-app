import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  ISingleNeuronSynaptome,
  ISingleNeuronSynaptomeFilter,
  TCreateSingleNeuronSynaptome,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/single-neuron-synaptome';

/**
 * Retrieves a list of synaptomes data from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the synaptome data query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the synaptome data for a single neuron.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getSingleNeuronSynaptomes({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ISingleNeuronSynaptomeFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISingleNeuronSynaptome>>(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a specific synaptome data from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the me-model to retrieve
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the synaptome data for a single neuron.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getSingleNeuronSynaptome({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISingleNeuronSynaptome>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

export async function createSingleNeuronSynaptome({
  body,
  context,
}: {
  body: TCreateSingleNeuronSynaptome;
  context: Required<WorkspaceContext>;
}) {
  const api = await entityCoreApi();
  return await api.post<ISingleNeuronSynaptome>(`${baseUri}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body,
  });
}
