import DetailView from '@/features/views/details/model';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext & { type: ModelEntitySlugValue; id: string }, null>) {
  const params = await promisedParams;
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <DetailView {...params} />;
}
