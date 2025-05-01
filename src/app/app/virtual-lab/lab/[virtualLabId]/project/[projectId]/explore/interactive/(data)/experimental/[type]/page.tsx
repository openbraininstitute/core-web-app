import { notFound } from 'next/navigation';
import omit from 'lodash/omit';

import ListingView from '@/features/views/listing';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { ExperimentalEntitySlugValue } from '@/entity-configuration/domain/slug';

export default async function Page(
  props: ServerSideComponentProp<
    WorkspaceContext & {
      type: ExperimentalEntitySlugValue;
    },
    null
  >
) {
  const params = await props.params;
  const entity = getEntityBySlug({ slug: params.type });
  if (!entity) {
    notFound();
  }

  return (
    <ListingView
      {...{
        entity: omit(entity, ['api', 'viewDefinition']),
        virtualLabId: params.virtualLabId,
        projectId: params.projectId,
      }}
    />
  );
}
