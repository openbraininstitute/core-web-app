
import authApiClient from '@/api/apiClient';
import { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { IPerson } from '@/api/entitycore/types/shared/global';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { entityCoreUrl } from '@/config';


const baseUri = "/person"
/**
 * Retrieves a list of people from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IPerson>>} A promise that resolves to the list of people (contributors)
 */
export async function getPersons() {
    const api = await authApiClient(entityCoreUrl);
    return await api.get<EntityCoreResponse<IPerson>>(
        baseUri,
        {
            ...getEntityCoreContext(),
        }
    );
}

/**
 * Retrieves one person from the EntityCoreAPI.

 * @returns {Promise<IPerson>} A promise that resolves to the single person
 */
export async function getMtype({ id }: { id: string }) {
    const api = await authApiClient(entityCoreUrl);
    return await api.get<IPerson>(
        `${baseUri}/${id}`,
        {
            ...getEntityCoreContext(),
        },
    );
}