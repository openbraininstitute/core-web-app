import { notFound, redirect } from 'next/navigation';

import { getEntity } from '@/api/entitycore/queries/general/entity';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { IEntity } from '@/api/entitycore/types/entities/entity';

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
    url = resolveExploreDetailsPageUrl({
      ctx: { virtualLabId, projectId },
      entityId: id,
      dataType: entity.type,
    });
  } catch (_e) {
    notFound();
  }

  redirect(url);
}
