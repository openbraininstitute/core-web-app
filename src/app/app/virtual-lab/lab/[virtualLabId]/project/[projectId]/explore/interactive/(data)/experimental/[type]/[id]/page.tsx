import type { Metadata } from 'next';

import DetailView from '@/features/views/details/experimental';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';

import type { ExperimentalEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { ServerSideComponentProp } from '@/types/common';

type Props = ServerSideComponentProp<{ type: ExperimentalEntitySlugValue; id: string }, null>;

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { type } = await params;
  const data = getEntityBySlug({ slug: type });

  return {
    title: data?.title ?? 'Experimental Details',
    description: `discover ${data?.title ? `${data.title} details` : 'experimental details'}`,
  };
};

export default async function Page({ params: promisedParams }: Props) {
  const params = await promisedParams;

  return <DetailView type={params.type} />;
}
