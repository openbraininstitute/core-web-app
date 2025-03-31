import authApiClient from '@/api/apiClient';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { IMType, IMtypeFilter } from '@/api/entitycore/types/shared/global';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { entityCoreUrl } from '@/config';

const baseUri = '/mtype';
/**
 * Retrieves a list of mtypes from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IMType>>} A promise that resolves to the list of mtypes
 */
export async function getMtypes({ filters }: { filters?: IMtypeFilter }) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<EntityCoreResponse<IMType>>(baseUri, {
    ...getEntityCoreContext(),
    queryParams: {
      ...filters,
    },
  });
}

/**
 * Retrieves one mtype from the EntityCoreAPI.

 * @returns {Promise<IMType>} A promise that resolves to the single mtype
 */
export async function getMtype({ id }: { id: string }) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<IMType>(`${baseUri}/${id}`, undefined, {
    cache: { cacheName: 'mtype', enabled: true, ttlInSeconds: 86_400 },
  });
}
