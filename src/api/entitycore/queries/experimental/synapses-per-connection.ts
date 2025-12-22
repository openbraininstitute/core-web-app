import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  ExperimentalSynapsesPerConnectionFilter,
  IExperimentalSynapsesPerConnection,
} from '@/api/entitycore/types/entities/synapses-per-connection';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/experimental-synapses-per-connection';
/**
 * Retrieves a list of synapses per connection morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ExperimentalSynapsesPerConnectionFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IExperimentalSynapsesPerConnection>>} A promise that resolves to the list of synapses per connection
 */
export async function getExperimentalSynapsesPerConnections({
  withFacets,
  filters,
  context,
}: {
  withFacets?: boolean;
  filters?: ExperimentalSynapsesPerConnectionFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalSynapsesPerConnection>>(baseUri, {
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
 * Retrieves a specific synapses per connection by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the synapses per connection to retrieve
 * @returns {Promise<IExperimentalSynapsesPerConnection>} A promise that resolves to the requested synapses per connection
 */
export async function getExperimentalSynapsesPerConnection({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IExperimentalSynapsesPerConnection>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
