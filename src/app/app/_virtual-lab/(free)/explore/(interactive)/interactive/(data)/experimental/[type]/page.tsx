import omit from 'es-toolkit/compat/omit';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import ListingView from '@/features/views/listing';

import type { ExperimentalEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export type Props = ServerSideComponentProp<
  WorkspaceContext & {
    type: ExperimentalEntitySlugValue;
  },
  null
>;

export async function generateMetadata({ params: promisedParams }: Props): Promise<Metadata> {
  const params = await promisedParams;
  const entity = getEntityBySlug({ slug: params.type });

  return {
    title: entity?.title ?? 'Entities listing',
  };
}

export default async function Page({ params: promisedParams }: Props) {
  const params = await promisedParams;
  const entity = getEntityBySlug({ slug: params.type });

  if (!entity) {
    notFound();
  }

  return (
    <ListingView
      entity={omit(entity, ['api', 'viewDefinition'])}
      virtualLabId={params.virtualLabId}
      projectId={params.projectId}
    />
  );
}
