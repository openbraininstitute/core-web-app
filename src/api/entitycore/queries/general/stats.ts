import authApiClient from '@/api/apiClient';

import { EntityCountsResponse } from '@/api/entitycore/types/entities/stats';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { entityCoreUrl } from '@/config';

const baseUri = "/entity-stats";


/**
 * Retrieves counts for specified entity types from the EntityCoreAPI.
 *
 * @param {Object} options - The options object
 * @param {string[]} options.entityNames - Array of entity names to get counts for
 * @returns {Promise<EntityCountsResponse>} A promise that resolves to a record of entity names and their counts
 * 
 * @example
 * // Get counts for multiple entity types
 * getEntityCounts({
 *   entityNames: [
 *     'reconstruction_morphology',
 *     'experimental_neuron_density',
 *     'experimental_bouton_density'
 *   ]
 * });
 * // Returns: 
 * {
 *   "reconstruction_morphology": 4626,
 *   "experimental_neuron_density": 62,
 *   "experimental_bouton_density": 6
 * }
 */
export async function getEntityCounts({
    entityNames
}: {
    entityNames: string[]
}): Promise<EntityCountsResponse> {
    const api = await authApiClient(entityCoreUrl);
    const queryParams = entityNames.reduce((params, name) => {
        return {
            ...params,
            entity_names: [...(params.entity_names || []), name]
        };
    }, { entity_names: [] as string[] });

    return await api.get<EntityCountsResponse>(
        `${baseUri}/counts`,
        {
            ...getEntityCoreContext(),
            queryParams
        }
    );
}
