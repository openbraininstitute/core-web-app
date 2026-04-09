import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type {
  ICircuitExtractionConfig,
  ICircuitExtractionConfigFilter,
  TCreateCircuitExtractionConfig,
  TUpdateCircuitExtractionConfig,
} from '@/api/entitycore/types/entities/circuit-extraction-config';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/circuit-extraction-config';

/**
 * Retrieves a specific circuit extraction config by its ID from the EntityCoreAPI.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction config to retrieve.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the circuit extraction config data.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitExtractionConfig({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ICircuitExtractionConfig>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a list of circuit extraction configs from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to an array of circuit extraction configs.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitExtractionConfigs({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ICircuitExtractionConfigFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ICircuitExtractionConfig>>(baseUri, {
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
 * Creates a new circuit extraction config in the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.data - The circuit extraction config data to create.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the created circuit extraction config.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function createCircuitExtractionConfig({
  data,
  context,
}: {
  data: TCreateCircuitExtractionConfig;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ICircuitExtractionConfig>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Updates an existing circuit extraction config in the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction config to update.
 * @param params.data - The circuit extraction config data to update.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the updated circuit extraction config.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function updateCircuitExtractionConfig({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateCircuitExtractionConfig;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ICircuitExtractionConfig>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Deletes a circuit extraction config from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction config to delete.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves when the circuit extraction config is deleted.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function deleteCircuitExtractionConfig({
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
