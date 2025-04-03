import { entityCoreApi } from '@/api/entitycore/utils';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  ExperimentalBoutonDensityFilter,
  IExperimentalBoutonDensity,
} from '@/api/entitycore/types/entities/bouton-density';

const baseUri = '/experimental-bouton-density';
/**
 * Retrieves a list of bouton density morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {ExperimentalBoutonDensityFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IExperimentalBoutonDensity>>} A promise that resolves to the list of bouton density
 */
export async function getExperimentalBoutonDensities({
  withFacets,
  filters,
}: {
  withFacets?: boolean;
  filters?: ExperimentalBoutonDensityFilter;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalBoutonDensity>>(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
  });
}

/**
 * Retrieves a specific bouton density by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the bouton density to retrieve
 * @returns {Promise<IExperimentalBoutonDensity>} A promise that resolves to the requested bouton density
 */
export async function getExperimentalBoutonDensity({ id }: { id: string }) {
  const api = await entityCoreApi();
  return await api.get<IExperimentalBoutonDensity>(`${baseUri}/${id}`);
}
