import type {
  ICircuitSimulationExecution,
  ICircuitSimulationExecutionFilter,
} from '@/api/entitycore/types/entities/circuit-simulation-execution';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';
import { compactRecord } from '@/utils/dictionary';

const baseUri = '/simulation-execution';

/**
 * Retrieves a specific circuit simulation execution by its ID from the EntityCoreAPI.
 *
 *
 */
export async function getCircuitSimulationExecution({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ICircuitSimulationExecution>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a list of circuit simulation executions from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to an array of circuit simulation executions.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuitSimulationExecutions({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ICircuitSimulationExecutionFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();

  return await api.get<EntityCoreResponse<ICircuitSimulationExecution>>(baseUri, {
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
