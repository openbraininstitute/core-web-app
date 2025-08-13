import { notFound } from 'next/navigation';
import snakeCase from 'lodash/snakeCase';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { Browse } from '@/features/views/listing/browse';
import { KebabCase } from '@/utils/type';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  null
>) {
  const { type } = await params;

  const entity = getEntityByExtendedType({ type: snakeCase(type) as TExtendedEntitiesTypeDict });

  if (!entity) return notFound();

  return <Browse />;
}
