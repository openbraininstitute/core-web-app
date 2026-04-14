import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { ICircuit, ICircuitFilter } from '@/api/entitycore/types/entities/circuit';
import type { TDerivationType } from '@/api/entitycore/types/entities/derivation';
import type { HierarchyTreeResponse } from '@/api/entitycore/types/shared/hierarchy';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/circuit';

/**
 * Retrieves a list of circuits data from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.withFacets - Optional flag to include facets in the response.
 * @param params.filters - Optional filters to apply to the synaptome data query.
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the data.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuits({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<ICircuitFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ICircuit>>(baseUri, {
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
 * Retrieves a specific circuit's data from the Entity Core API.
 *
 * @param params - The parameters for the API request.
 * @param params.id - The unique identifier of the me-model to retrieve
 * @param params.context - Optional workspace context for the API request.
 *
 * @returns A promise that resolves to the data.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function getCircuit({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<ICircuit>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves the hierarchy tree based on the specified derivation type.
 *
 ** Return a hierarchy tree of circuits based on derivations.
 * Depending on the derivation type, the hierarchy will be built differently. In particular, a circuit is considered a root if it has no parents of the specified derivation type.
 * The hierarchy assumes the following rules for the derivations:
 ** A circuit can have zero or more children linked with any derivation type.
 ** A circuit can have zero or more parents, provided each parent is different, and is linked with a different derivation type.
 ** A public circuit can have any combination of public and private circuits as children.
 ** A private circuit can have only private circuits with the same project_id as children.
 *
 ** See also https://github.com/openbraininstitute/entitycore/issues/292#issuecomment-3174884561
 *
 * @param context - Optional workspace context for the API request.
 * @param derivation_type - The type of derivation to filter the hierarchy.
 * @returns A promise that resolves to the hierarchy tree response.
 */
export async function getCircuitHierarchyByDerivation({
  context,
  derivation_type,
}: {
  context?: WorkspaceContext | null;
  derivation_type: TDerivationType;
}): Promise<HierarchyTreeResponse> {
  const api = await entityCoreApi();
  return await api.get(`${baseUri}/hierarchy`, {
    queryParams: {
      derivation_type,
    },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
