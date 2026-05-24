import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

const ENTITY_ID_IN_CHUNK_SIZE = 20;

function chunkIds(ids: string[], chunkSize: number): string[][] {
  const chunks: string[][] = [];

  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function retrieveEntity({
  type,
  id,
  ctx,
}: {
  type: TExtendedEntitiesTypeDict;
  id: string;
  ctx: WorkspaceContext;
}) {
  if (!type || !id) throw new Error('Type and ID are required to download an entity.');

  const entityType = getEntityByExtendedType({ type });
  if (!entityType) throw new Error(`Unsupported entity type: ${type}`);

  const request = entityType.api.query.one;

  let entity: AwaitedType<ReturnType<typeof request>> | undefined;

  try {
    entity = await request({ id, context: ctx });
  } catch {
    throw new Error(`Failed to fetch entity of type ${type} with ID ${id}`);
  }

  if (!entity) throw new Error(`Entity of type ${type} with ID ${id} not found`);
  return entity;
}

export async function retrieveEntities({
  type,
  ids,
  ctx,
}: {
  type: TExtendedEntitiesTypeDict;
  ids: string[];
  ctx: WorkspaceContext;
}): Promise<EntityCoreIdentifiableNamed[]> {
  if (!type) throw new Error('Type is required to download entities.');

  const entityType = getEntityByExtendedType({ type });
  if (!entityType) throw new Error(`Unsupported entity type: ${type}`);

  const request = entityType.api.query.list;
  if (!request) {
    throw new Error(`List query is not supported for entity type: ${type}`);
  }

  const uniqueIds = [...new Set(ids.filter(Boolean))].sort();

  if (uniqueIds.length === 0) {
    return [];
  }

  const responses = await Promise.all(
    chunkIds(uniqueIds, ENTITY_ID_IN_CHUNK_SIZE).map((chunk) =>
      request({ context: ctx, withFacets: false, filters: { id__in: chunk } })
    )
  );

  return responses.flatMap((response) => response.data as EntityCoreIdentifiableNamed[]);
}

export type TRetrieveEntityOutput = Awaited<ReturnType<typeof retrieveEntity>>;
