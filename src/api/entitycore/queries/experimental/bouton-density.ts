import type {
  ExperimentalBoutonDensityFilter,
  IExperimentalBoutonDensity,
} from '@/api/entitycore/types/entities/bouton-density';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';

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
  context,
}: {
  withFacets?: boolean;
  filters?: ExperimentalBoutonDensityFilter;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IExperimentalBoutonDensity>>(baseUri, {
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
 * Retrieves a specific bouton density by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the bouton density to retrieve
 * @returns {Promise<IExperimentalBoutonDensity>} A promise that resolves to the requested bouton density
 */
export async function getExperimentalBoutonDensity({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<IExperimentalBoutonDensity>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
