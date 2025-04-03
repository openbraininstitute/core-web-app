import { entityCoreApi } from '@/api/entitycore/utils';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  ExperimentalNeuronDensityFilter,
  IExperimentalNeuronDensity,
} from '@/api/entitycore/types/entities/neuron-density';

const baseUri = '/experimental-neuron-density';
/**
 * Retrieves a list of neuron density from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ExperimentalNeuronDensityFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IExperimentalNeuronDensity>>} A promise that resolves to the list of neuron density
 */
export async function getExperimentalNeuronDensities({
  withFacets,
  filters,
}: {
  withFacets?: boolean;
  filters?: ExperimentalNeuronDensityFilter;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalNeuronDensity>>(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
  });
}

/**
 * Retrieves a specific neuron density by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the neuron density to retrieve
 * @returns {Promise<IExperimentalNeuronDensity>} A promise that resolves to the requested neuron density
 */
export async function getExperimentalNeuronDensity({ id }: { id: string }) {
  const api = await entityCoreApi();
  return await api.get<IExperimentalNeuronDensity>(`${baseUri}/${id}`);
}
