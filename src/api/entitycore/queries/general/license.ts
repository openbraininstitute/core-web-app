import type { ILicense } from '@/api/entitycore/types/shared/global';
import type { ILicenseFilter } from '@/api/entitycore/types/shared/license';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import type { WorkspaceContext } from '@/types/common';
import { compactRecord } from '@/utils/dictionary';

const baseUri = '/license';

/**
 * Retrieves licenses from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the licenses query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the licenses.
 */
export async function getLicenses({
  filters,
  context,
}: {
  filters?: Partial<ILicenseFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<ILicense>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ILicense>>(baseUri, {
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
 * Retrieves a license from the Entity Core API.
 *
 * @param id - The ID of the license to retrieve.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the license.
 */
export async function getLicense({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<ILicense>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ILicense>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
