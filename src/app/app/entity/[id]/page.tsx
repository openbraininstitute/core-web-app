import { redirect, notFound } from 'next/navigation';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { IEntity } from '@/api/entitycore/types/entities/entity';
import { virtualLabApi } from '@/config';
import authFetch from '@/authFetch';

interface Group {
  project_id: string;
  virtual_lab_id: string;
}

export default async function EntityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let entity: IEntity;
  try {
    entity = await getEntity({ uuid: id });
  } catch (e) {
    notFound();
  }
  const typeConfig = getEntityByCoreType({ type: entity.type });

  if (!typeConfig) notFound();
  if (entity.authorized_public) {
    redirect(`/app/virtual-lab/explore/${typeConfig.explore.routePrefix}/${typeConfig.slug}/${id}`);
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

  redirect(
    `/app/virtual-lab/lab/${group.virtual_lab_id}/project/${entity.authorized_project_id}/explore/${typeConfig.explore.routePrefix}/${typeConfig.slug}/${id}`
  );
}
