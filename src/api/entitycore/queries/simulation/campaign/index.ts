import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ICircuitSimulationCampaign,
  ISimulationCampaignFilter,
  TCreateCircuitSimulation,
} from '@/api/entitycore/types/entities/simulation-campaign';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/simulation-campaign';

/**
 * Retrieves a specific circuit simulation campaign by its ID from the EntityCoreAPI.
 *
 *
 */
export async function getSimulationCampaign({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ICircuitSimulationCampaign>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a list of circuit simulation campaigns from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to an array of circuit simulation campaigns.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getSimulationCampaigns({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ISimulationCampaignFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ICircuitSimulationCampaign>>(baseUri, {
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

export async function createSimulationCampaign({
  data,
  context,
}: {
  data: TCreateCircuitSimulation;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ICircuitSimulationCampaign>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}
