import { notFound } from 'next/navigation';

import { WorkspaceSection } from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { resolveExtendedTypeFromPathParamUrl } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export default async function NotebooksBrowsePage({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  { scope?: string }
>) {
  const { type } = await params;

  const entity = getEntityByExtendedType({
    type: resolveExtendedTypeFromPathParamUrl({ pathParam: type }).type,
  });

  if (!entity || entity.group !== EntityTypeGroup.Notebooks) notFound();

  return (
    <BrowseEntityScope
      section={WorkspaceSection.Notebooks}
      dataType={entity.extendedType}
      requireBrainRegion={false}
      requireMiniDetailView
    />
  );
}
