import type {
  ICircuitExtractionExecution,
  ICircuitExtractionExecutionFilter,
  TCreateCircuitExtractionExecution,
  TUpdateCircuitExtractionExecution,
} from '@/api/entitycore/types/entities/circuit-extraction-execution';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';
import { compactRecord } from '@/utils/dictionary';

const baseUri = '/circuit-extraction-execution';

/**
 * Retrieves a specific circuit extraction execution by its ID from the EntityCoreAPI.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction execution to retrieve.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the circuit extraction execution data.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitExtractionExecution({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ICircuitExtractionExecution>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a list of circuit extraction executions from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to an array of circuit extraction executions.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitExtractionExecutions({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ICircuitExtractionExecutionFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ICircuitExtractionExecution>>(baseUri, {
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
 * Creates a new circuit extraction execution in the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.data - The circuit extraction execution data to create.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the created circuit extraction execution.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function createCircuitExtractionExecution({
  data,
  context,
}: {
  data: TCreateCircuitExtractionExecution;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.post<ICircuitExtractionExecution>(baseUri, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Updates an existing circuit extraction execution in the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction execution to update.
 * @param params.data - The circuit extraction execution data to update.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the updated circuit extraction execution.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function updateCircuitExtractionExecution({
  id,
  data,
  context,
}: {
  id: string;
  data: TUpdateCircuitExtractionExecution;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.patch<ICircuitExtractionExecution>(`${baseUri}/${id}`, {
    body: data,
    headers: {
      ...getEntityCoreContext(context).headers,
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

/**
 * Deletes a circuit extraction execution from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the circuit extraction execution to delete.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves when the circuit extraction execution is deleted.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function deleteCircuitExtractionExecution({
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
