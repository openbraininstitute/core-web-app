import { entityCoreApi } from '@/api/entitycore/utils';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';
import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';

const baseUri = '/experimental-synapses-per-connection';
/**
 * Retrieves a list of synapses per connection morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {PaginationFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IExperimentalSynapsesPerConnection>>} A promise that resolves to the list of synapses per connection
 */
export async function getExperimentalSynapsesPerConnections({
  filters,
}: {
  filters?: PaginationFilter;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalSynapsesPerConnection>>(baseUri, {
    queryParams: {
      ...filters,
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
export async function getExperimentalSynapsesPerConnection({ id }: { id: string }) {
  const api = await entityCoreApi();
  return await api.get<IExperimentalSynapsesPerConnection>(`${baseUri}/${id}`);
}
