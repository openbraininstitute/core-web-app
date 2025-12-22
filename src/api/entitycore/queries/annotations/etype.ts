import { getEntityCoreContext } from '@/api/entitycore/utils';
import { authApiClient } from '@/api/apiClient';
import { config } from '@/config';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IEType, IETypeFilter } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/etype';
/**
 * Retrieves a list of etypes from the EntityCoreAPI.

 * @returns {Promise<EntityCoreResponse<IEType>>} A promise that resolves to the list of etypes
 */
export async function getEtypes({
  filters,
  ctx,
}: {
  filters?: IETypeFilter;
  ctx?: WorkspaceContext;
}) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<EntityCoreResponse<IEType>>(baseUri, {
    ...getEntityCoreContext(ctx),
    queryParams: {
      ...filters,
    },
  });
}

/**
 * Retrieves one etype from the EntityCoreAPI.

 * @returns {Promise<IEType>} A promise that resolves to the single etype
 */
export async function getEtype({ id }: { id: string }) {
  const api = await authApiClient(config.ENTITY_CORE_URL);
  return await api.get<IEType>(`${baseUri}/${id}`);
}
