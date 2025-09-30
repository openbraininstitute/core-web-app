import { redirect, notFound } from 'next/navigation';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { IEntity } from '@/api/entitycore/types/entities/entity';
import authFetch from '@/authFetch';
import { resolveExploreDetailsPageUrl2 } from '@/utils/url-builder';
import { entityCorePublicProjectId, entityCorePublicVirtualLabId, virtualLabApi } from '@/config';

interface Group {
  project_id: string;
  virtual_lab_id: string;
}

export default async function EntityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let entity: IEntity;
  let url: string;
  try {
    entity = await getEntity({ id });
    url = resolveExploreDetailsPageUrl2({
      entityId: id,
      dataType: entity.type,
      ctx: { virtualLabId: entityCorePublicVirtualLabId, projectId: entityCorePublicProjectId },
    });
  } catch (e) {
    notFound();
  }
  if (entity.authorized_public) {
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

    url = resolveExploreDetailsPageUrl2({
      ctx: { virtualLabId: group.virtual_lab_id, projectId: entity.authorized_project_id },
      entityId: id,
      dataType: entity.type,
    });
  } catch {
    notFound();
  }

  redirect(url);
}
