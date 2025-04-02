import { entityCoreApi } from '@/api/entitycore/utils';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { PaginationFilter } from '@/api/entitycore/types/shared/request';

const baseUri = '/experimental-bouton-density';
/**
 * Retrieves a list of bouton density morphologies from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {PaginationFilter} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IExperimentalBoutonDensity>>} A promise that resolves to the list of bouton density
 */
export async function getExperimentalBoutonDensities({ filters }: { filters?: PaginationFilter }) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalBoutonDensity>>(baseUri, {
    queryParams: {
      ...filters,
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
