import type {
  ICircuitExtractionConfigGeneration,
  ICircuitExtractionConfigGenerationFilter,
  TCreateCircuitExtractionConfigGeneration,
  TUpdateCircuitExtractionConfigGeneration,
} from '@/api/entitycore/types/entities/circuit-extraction-config-generation';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';
import { compactRecord } from '@/utils/dictionary';

const baseUri = '/circuit-extraction-config-generation';

/**
 * Retrieves a specific circuit extraction config generation by its ID from the EntityCoreAPI.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction config generation to retrieve.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the circuit extraction config generation data.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitExtractionConfigGeneration({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ICircuitExtractionConfigGeneration>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a list of circuit extraction config generations from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to an array of circuit extraction config generations.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitExtractionConfigGenerations({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ICircuitExtractionConfigGenerationFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ICircuitExtractionConfigGeneration>>(baseUri, {
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
 * Creates a new circuit extraction config generation in the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.data - The circuit extraction config generation data to create.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the created circuit extraction config generation.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function createCircuitExtractionConfigGeneration({
  data,
  context,
}: {
  data: TCreateCircuitExtractionConfigGeneration;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ICircuitExtractionConfigGeneration>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Updates an existing circuit extraction config generation in the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction config generation to update.
 * @param params.data - The circuit extraction config generation data to update.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the updated circuit extraction config generation.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function updateCircuitExtractionConfigGeneration({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateCircuitExtractionConfigGeneration;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ICircuitExtractionConfigGeneration>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Deletes a circuit extraction config generation from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction config generation to delete.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves when the circuit extraction config generation is deleted.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function deleteCircuitExtractionConfigGeneration({
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
