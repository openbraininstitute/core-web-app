import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { ISpeciesFilter, TSpeciesCreate } from '@/api/entitycore/types/shared/species';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { ISpecies } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/species';

/**
 * Retrieves species from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the species query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the species.
 */
export async function getSpecies({
  filters,
  context,
}: {
  filters?: Partial<ISpeciesFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<ISpecies>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISpecies>>(baseUri, {
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
 * Retrieves a species from the Entity Core API.
 *
 * @param id - The ID of the species to retrieve.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the species.
 */
export async function getOneSpecies({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<ISpecies>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISpecies>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a species in the Entity Core API.
 *
 * @param species - The species to create.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the created species.
 */
export async function createSpecies({
  species,
  context,
}: {
  species: TSpeciesCreate;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<ISpecies>> {
  const api = await entityCoreApi();
  return await api.post<EntityCoreResponse<ISpecies>>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: species,
  });
}
