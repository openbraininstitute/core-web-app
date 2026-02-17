import { authApiClient } from '@/api/apiClient';
import { getEntityCoreContext } from '@/api/entitycore/utils';
import { config } from '@/config';

import type { IMType, IMTypeFilter } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/mtype';
/**
 * Retrieves a list of mtypes from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IMType>>} A promise that resolves to the list of mtypes
 */
export async function getMtypes({
  filters,
  ctx,
}: {
  filters?: IMTypeFilter;
  ctx?: WorkspaceContext;
}) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<EntityCoreResponse<IMType>>(baseUri, {
    ...getEntityCoreContext(ctx),
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
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<IMType>(`${baseUri}/${id}`, undefined, {
    cache: { cacheName: 'mtype', enabled: true, ttlInSeconds: 86_400 },
  });
}
