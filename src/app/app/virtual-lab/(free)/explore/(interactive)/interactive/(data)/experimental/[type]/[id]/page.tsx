import DetailView from '@/features/views/details/experimental';

import type { ExperimentalEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<{ type: ExperimentalEntitySlugValue }, null>) {
  const params = await promisedParams;

  return <DetailView type={params.type} />;
}
