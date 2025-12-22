import { authApiClient } from '@/api/apiClient';
import { config } from '@/config';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IPersonFilter } from '@/api/entitycore/types/entities/agent';
import type { IPerson } from '@/api/entitycore/types/shared/global';

const baseUri = '/person';
/**
 * Retrieves a list of people from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IPerson>>} A promise that resolves to the list of people (contributors)
 */
export async function getPersons({ filters }: { filters: Partial<IPersonFilter> }) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<EntityCoreResponse<IPerson>>(baseUri, {
    queryParams: {
      ...filters,
    },
  });
}

/**
 * Retrieves one person from the EntityCoreAPI.

 * @returns {Promise<IPerson>} A promise that resolves to the single person
 */
export async function getPerson({ id }: { id: string }) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<IPerson>(`${baseUri}/${id}`);
}
