import { authApiClient } from '@/api/apiClient';
import { entityCoreUrl } from '@/config';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IConsortiumFilter } from '@/api/entitycore/types/entities/agent';
import type { IConsortium } from '@/api/entitycore/types/shared/global';

const baseUri = '/consortium';
/**
 * Retrieves a list of consortia from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IConsortium>>} A promise that resolves to the list of consortia
 */
export async function getConsortia({ filters }: { filters: Partial<IConsortiumFilter> }) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<EntityCoreResponse<IConsortium>>(baseUri, {
    queryParams: {
      ...filters,
    },
  });
}

/**
 * Retrieves one consortium from the EntityCoreAPI.

 * @returns {Promise<IConsortium>} A promise that resolves to the single consortium
 */
export async function getConsortium({ id }: { id: string }) {
  const api = await authApiClient(entityCoreUrl);
  return await api.get<IConsortium>(`${baseUri}/${id}`);
}
