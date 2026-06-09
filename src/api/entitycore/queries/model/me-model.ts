import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type {
  IMEModel,
  IMEModelFilter,
  TCreateMEModel,
} from '@/api/entitycore/types/entities/me-model';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

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
  context,
}: {
  withFacets?: boolean;
  filters?: Partial<IMEModelFilter>;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IMEModel>>(baseUri, {
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
 * Retrieves a specific me-model by its ID from the EntityCoreAPI.
 *
 * @param {Object} params - The parameters object
 * @param {string} params.id - The unique identifier of the me-model to retrieve
 * @returns {Promise<IEModel>} A promise that resolves to the requested me-model
 */
export async function getMEModel({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const api = await entityCoreApi();
  console.log('🐞 [me-model@57] id =', id); // @FIXME: Remove this line written on 2026-06-09 at 15:26
  const result = await api.get<IMEModel>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
  console.log('🐞 [me-model@64] result =', result); // @FIXME: Remove this line written on 2026-06-09 at 15:26
  return result;
}

/**
 * Creates a new ME model in entity core API.
 *
 * @param params - The parameters for creating the ME model.
 * @param params.body - The payload containing the data for the new ME model.
 * @param params.context - The workspace context containing necessary headers and configurations.
 * @returns {Promise<IEModel>} A promise that resolves to the created ME model.
 *
 * @throws Will throw an error if the API request fails.
 */
export async function createMEModel({
  body,
  context,
}: {
  body: TCreateMEModel;
  context: Required<WorkspaceContext>;
}) {
  const api = await entityCoreApi();
  return await api.post<IMEModel>(`${baseUri}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body,
  });
}
