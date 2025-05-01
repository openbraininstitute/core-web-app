import DetailView from '@/features/views/details/model';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';

export default async function Page(
  props: ServerSideComponentProp<
    WorkspaceContext & { type: ModelEntitySlugValue; id: string },
    null
  >
) {
  const params = await props.params;
  return <DetailView {...params} />;
}
