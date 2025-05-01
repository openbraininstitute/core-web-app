import { notFound } from 'next/navigation';
import omit from 'lodash/omit';

import ListingView from '@/features/views/listing/model-listing-view';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';

export default async function Page(
  props: ServerSideComponentProp<
    WorkspaceContext & {
      type: ModelEntitySlugValue;
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
