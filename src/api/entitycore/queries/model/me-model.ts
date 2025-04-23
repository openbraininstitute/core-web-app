import { entityCoreApi } from '@/api/entitycore/utils';
import type { IMEModel, IMEModelFilter } from '@/api/entitycore/types/entities/me-model';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';

const baseUri = '/memodel';
/**
 * Retrieves a list of me-models from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {IMEModel} [options.filters] - Optional filters to apply to the query
 * @returns {Promise<EntityCoreResponse<IMEModel>>} A promise that resolves to the list of me-models
 */
export async function getMEModels({
  withFacets,
  filters,
}: {
  withFacets?: boolean;
  filters?: IMEModelFilter;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IMEModel>>(baseUri, {
    queryParams: {
      ...filters,
      with_facets: withFacets,
    },
  });
}

/**
 * Retrieves a specific me-model by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the me-model to retrieve
 * @returns {Promise<IEModel>} A promise that resolves to the requested me-model
 */
export async function getMEModel({ id }: { id: string }) {
  const api = await entityCoreApi();
  return await api.get<IMEModel>(`${baseUri}/${id}`);
}
