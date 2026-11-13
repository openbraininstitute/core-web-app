import { snakeCase } from 'es-toolkit/compat';
import { notFound } from 'next/navigation';

import { DATA_LISTING_PROPS } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import {
  DATA_BROWSE_ALLOWED_ENTITIES as AllowedEntities,
  DATA_BROWSE_LISTING_PROPS,
} from '@/features/views/listing/data-browse-entities';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export default async function Page({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  unknown
>) {
  const { type } = await params;

  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const entity = getEntityByExtendedType({ type: dataType });
  const isAllowed = AllowedEntities.includes(
    entity?.extendedType as unknown as (typeof AllowedEntities)[number]
  );
  if (!entity || !isAllowed) notFound();

  return (
    <BrowseEntityScope {...DATA_LISTING_PROPS} dataType={dataType} {...DATA_BROWSE_LISTING_PROPS} />
  );
}
