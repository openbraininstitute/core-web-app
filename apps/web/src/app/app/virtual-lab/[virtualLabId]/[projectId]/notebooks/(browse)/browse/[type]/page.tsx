import { notFound } from 'next/navigation';

import { WorkspaceSection } from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { resolveExtendedTypeFromPathParamUrl } from '@/utils/url-builder';

import type { Metadata } from 'next';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export async function generateMetadata({
  params,
}: ServerSideComponentProp<
  WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> },
  { scope?: string }
>): Promise<Metadata> {
  const { type } = await params;

  const entity = getEntityByExtendedType({
    type: resolveExtendedTypeFromPathParamUrl({ pathParam: type }).type,
  });

  const entityTitle = entity?.title ?? 'Notebooks';
  const title = `${entityTitle} - Notebooks | Open Brain Institute`;
  const description = `Browse ${entityTitle.toLowerCase()} in your project on the Open Brain Institute.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

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
