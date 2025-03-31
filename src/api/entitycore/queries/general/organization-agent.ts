
import authApiClient from '@/api/apiClient';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { IOrganization } from '@/api/entitycore/types/shared/global';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { entityCoreUrl } from '@/config';


const baseUri = "/organization"
/**
 * Retrieves a list of organizations from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IOrganization>>} A promise that resolves to the list of organizations
 */
export async function geOrganizations() {
    const api = await authApiClient(entityCoreUrl);
    return await api.get<EntityCoreResponse<IOrganization>>(
        baseUri,
    );
}

/**
 * Retrieves one organization from the EntityCoreAPI.

 * @returns {Promise<IOrganization>} A promise that resolves to the single organization
 */
export async function geOrganization({ id }: { id: string }) {
    const api = await authApiClient(entityCoreUrl);
    return await api.get<IOrganization>(
        `${baseUri}/${id}`,
    );
}