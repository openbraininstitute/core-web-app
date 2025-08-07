import { redirect, notFound } from 'next/navigation';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { IEntity } from '@/api/entitycore/types/entities/entity';
import { virtualLabApi } from '@/config';
import authFetch from '@/authFetch';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

interface Group {
  project_id: string;
  virtual_lab_id: string;
}

export default async function EntityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let entity: IEntity;
  try {
    entity = await getEntity({ id });
  } catch (e) {
    notFound();
  }
  if (entity.authorized_public) {
    const url = resolveExploreDetailsPageUrl({ entityId: id, entityType: entity.type });
    redirect(url);
  }

  let group: Group | undefined;

  try {
    const res = await authFetch(`${virtualLabApi.url}/users/groups`);
    if (!res.ok) notFound();
    const json = (await res.json()) as {
      data: {
        groups: Group[];
      };
    };
    const { groups } = json.data;
    group = groups.find((g) => g.project_id === entity.authorized_project_id);

    if (!group) notFound();
  } catch {
    notFound();
  }

  const url = resolveExploreDetailsPageUrl({
    ctx: { virtualLabId: group.virtual_lab_id, projectId: entity.authorized_project_id },
    entityId: id,
    entityType: entity.type,
  });

  redirect(url);
}
