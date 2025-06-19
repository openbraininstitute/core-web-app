import { notFound } from 'next/navigation';

import ListingView from '@/features/views/listing';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { ExperimentalEntitySlugValue } from '@/entity-configuration/domain/slug';

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<
  WorkspaceContext & {
    type: ExperimentalEntitySlugValue;
  },
  null
>) {
  const params = await promisedParams;
  const entity = getEntityBySlug({ slug: params.type });
  if (!entity) {
    notFound();
  }

  return (
    <ListingView entity={entity} virtualLabId={params.virtualLabId} projectId={params.projectId} />
  );
}
