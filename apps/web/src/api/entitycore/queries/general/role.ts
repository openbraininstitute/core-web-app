import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IRole, IRoleFilter } from '@/api/entitycore/types/shared/role';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/role';

/**
 * Retrieves roles from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the roles query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the roles.
 */
export async function getRoles({
  filters,
  context,
}: {
  filters?: Partial<IRoleFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IRole>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IRole>>(baseUri, {
    queryParams: compactRecord({
      ...filters,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a role from the Entity Core API.
 *
 * @param id - The ID of the role to retrieve.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the role.
 */
export async function getRole({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IRole>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IRole>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
