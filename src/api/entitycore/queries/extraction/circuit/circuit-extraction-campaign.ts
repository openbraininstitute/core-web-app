import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ICircuitExtractionCampaign,
  ICircuitExtractionCampaignFilter,
  TCreateCircuitExtractionCampaign,
  TUpdateCircuitExtractionCampaign,
} from '@/api/entitycore/types/entities/circuit-extraction-campaign';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/circuit-extraction-campaign';

/**
 * Retrieves a specific circuit extraction campaign by its ID from the EntityCoreAPI.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction campaign to retrieve.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the circuit extraction campaign data.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitExtractionCampaign({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ICircuitExtractionCampaign>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a list of circuit extraction campaigns from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to an array of circuit extraction campaigns.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitExtractionCampaigns({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ICircuitExtractionCampaignFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ICircuitExtractionCampaign>>(baseUri, {
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
 * Creates a new circuit extraction campaign in the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.data - The circuit extraction campaign data to create.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the created circuit extraction campaign.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function createCircuitExtractionCampaign({
  data,
  context,
}: {
  data: TCreateCircuitExtractionCampaign;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ICircuitExtractionCampaign>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Updates an existing circuit extraction campaign in the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction campaign to update.
 * @param params.data - The circuit extraction campaign data to update.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the updated circuit extraction campaign.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function updateCircuitExtractionCampaign({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateCircuitExtractionCampaign;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ICircuitExtractionCampaign>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Deletes a circuit extraction campaign from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction campaign to delete.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves when the circuit extraction campaign is deleted.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function deleteCircuitExtractionCampaign({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.delete(`${baseUri}/${id}`, {
    headers: {
      ...getEntityCoreContext(context).headers,
      accept: 'application/json',
    },
  });
}
