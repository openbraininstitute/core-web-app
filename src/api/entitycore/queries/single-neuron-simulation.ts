import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  ISingleNeuronSimulation,
  TCreateSingleNeuronSimulation,
  ISingleNeuronSimulationFilter,
} from '@/api/entitycore/types/entities/single-neuron-simulation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/single-neuron-simulation';

/**
 * Retrieves a specific single neuron simulation by its ID from the EntityCoreAPI.
 *
 *
 */
export async function getSingleNeuronSimulation({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ISingleNeuronSimulation>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a list of simulations data from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the synaptome data query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the simulation data for a single neuron.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getSingleNeuronSimulations({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ISingleNeuronSimulationFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISingleNeuronSimulation>>(baseUri, {
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
 * Creates a new ME model in entity core API.
 *
 * @param params - The parameters for creating the ME model.
 * @param params.body - The payload containing the data for the new ME model.
 * @param params.context - The workspace context containing necessary headers and configurations.
 * @returns {Promise<IEModel>} A promise that resolves to the created ME model.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function createSingleNeuronSimulation({
  body,
  context,
}: {
  body: TCreateSingleNeuronSimulation;
  context: Required<WorkspaceContext>;
}) {
  const api = await entityCoreApi();
  return await api.post<ISingleNeuronSimulation>(`${baseUri}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body,
  });
}
