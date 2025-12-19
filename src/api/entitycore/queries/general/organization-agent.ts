import { authApiClient } from '@/api/apiClient';
import type { IOrganizationFilter } from '@/api/entitycore/types/entities/agent';
import type { IOrganization } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { config } from '@/config';

const baseUri = '/organization';
/**
 * Retrieves a list of organizations from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IOrganization>>} A promise that resolves to the list of organizations
 */
export async function getOrganizations({ filters }: { filters: Partial<IOrganizationFilter> }) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<EntityCoreResponse<IOrganization>>(baseUri, {
    queryParams: {
      ...filters,
    },
  });
}

/**
 * Retrieves one organization from the EntityCoreAPI.

 * @returns {Promise<IOrganization>} A promise that resolves to the single organization
 */
export async function getOrganization({ id }: { id: string }) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<IOrganization>(`${baseUri}/${id}`);
}
