import { kebabCase } from 'es-toolkit/compat';

import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { EntityCountResponse, IEntity } from '@/api/entitycore/types/entities/entity';
import type {
  TEntityTypeDict,
  TEntityTypeWithBrainRegionDict,
} from '@/api/entitycore/types/entity-type';
import type { BrainRegionHierarchyFilter } from '@/api/entitycore/types/shared/request';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/entity';

/**
 * Retrieves the count of entities from the Entity Core API based on the provided context and entity types.
 *
 * @param params - The parameters for the request.
 * @param params.context - Optional workspace context for the API call.
 * @param params.types - Optional partial object specifying entity types and brain region enums to filter the count.
 * @returns A promise that resolves to an `EntityCoreResponse` containing the count of entities matching the criteria.
 */
export async function getEntitiesCount({
  context,
  types,
  brainRegion,
}: {
  context?: WorkspaceContext | null;
  types?: Array<TEntityTypeWithBrainRegionDict>;
  brainRegion: BrainRegionHierarchyFilter;
}): Promise<EntityCountResponse> {
  const api = await entityCoreApi();
  return await api.get(`${baseUri}/counts`, {
    queryParams: compactRecord({
      types,
      ...brainRegion,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves the entity from the Entity Core API by its
 *
 * @param params.id The UUID of the entity.
 * @param params.context - Optional workspace context for the API call.
 * @returns A promise that resolves to an `EntityCoreResponse` containing the count of entities matching the criteria.
 */
export async function getEntity({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<IEntity> {
  const api = await entityCoreApi();
  return await api.get(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Renames an entity and rewrites its description through its own route's `PATCH`, which takes
 * both on every type a workflow listing shows (task configs, simulation campaigns, the legacy
 * single-neuron ones).
 */
export async function updateEntityDetails({
  type,
  id,
  data,
  context,
}: {
  type: TEntityTypeDict;
  id: string;
  data: { name: string; description: string };
  context?: WorkspaceContext | null;
}): Promise<IEntity> {
  const api = await entityCoreApi();
  return await api.patch(`/${kebabCase(type)}/${id}`, {
    body: data,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}
