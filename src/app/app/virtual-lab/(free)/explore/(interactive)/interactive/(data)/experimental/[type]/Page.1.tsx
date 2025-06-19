import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import ListingView from '@/features/views/listing';
import { notFound } from 'next/navigation';
import { Props } from './page';

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
