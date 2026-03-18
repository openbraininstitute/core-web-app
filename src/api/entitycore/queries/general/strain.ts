import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { IStrain } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { IStrainFilter, TStrainCreate } from '@/api/entitycore/types/shared/strain';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/strain';

/**
 * Retrieves strains from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the strain query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the strains.
 */
export async function getStrains({
  filters,
  context,
}: {
  filters?: Partial<IStrainFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IStrain>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IStrain>>(baseUri, {
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
 * Retrieves a strain from the Entity Core API.
 *
 * @param id - The ID of the strain to retrieve.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the strain.
 */
export async function getStrain({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IStrain>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<IStrain>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a strain in the Entity Core API.
 *
 * @param strain - The strain to create.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the created strain.
 */
export async function createStrain({
  strain,
  context,
}: {
  strain: TStrainCreate;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<IStrain>> {
  const api = await entityCoreApi();
  return await api.post<EntityCoreResponse<IStrain>>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: strain,
  });
}
