import {
  EntityCoreExtendedType,
  getEntityByExtendedType,
} from '@/entity-configuration/domain/helpers';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

export async function retrieveEntity({
  type,
  id,
  ctx,
}: {
  type: EntityCoreExtendedType;
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

export type TRetrieveEntityOutput = Awaited<ReturnType<typeof retrieveEntity>>;
