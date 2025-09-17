import type { Metadata } from 'next';

import DetailView from '@/features/views/details/model';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { ModelEntitySlugValue } from '@/entity-configuration/domain/slug';

type Props = ServerSideComponentProp<
  WorkspaceContext & { type: ModelEntitySlugValue; id: string },
  null
>;

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { type } = await params;
  const data = getEntityBySlug({ slug: type });

  return {
    title: data?.title ?? 'Model Details',
    description: `discover ${data?.title ? `${data.title} details` : 'discover model details'}`,
  };
};

export default async function Page({
  params: promisedParams,
}: ServerSideComponentProp<WorkspaceContext & { type: ModelEntitySlugValue; id: string }, null>) {
  const params = await promisedParams;
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <DetailView {...params} />;
}
