import { redirect, notFound } from 'next/navigation';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { IEntity } from '@/api/entitycore/types/entities/entity';
import { resolveExploreDetailsPageUrl2 } from '@/utils/url-builder';

export default async function EntityDetail({
  params,
}: {
  params: Promise<{ virtualLabId: string; projectId: string; id: string }>;
}) {
  const { id, virtualLabId, projectId } = await params;

  let entity: IEntity;
  let url: string;
  try {
    entity = await getEntity({ id });
    url = resolveExploreDetailsPageUrl2({
      ctx: { virtualLabId, projectId },
      entityId: id,
      dataType: entity.type,
    });
  } catch (e) {
    notFound();
  }

  redirect(url);
}
