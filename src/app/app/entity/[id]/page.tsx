import { redirect, notFound } from 'next/navigation';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { resolveExploreDetailsPageUrl2 } from '@/utils/url-builder';
import { tryCatch } from '@/api/utils';
import { resolveWorkspace } from '@/ui/segments/app-setup/helpers';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';

export default async function EntityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: entity, error: entityError } = await tryCatch(() => getEntity({ id }));
  if (!entity || entityError) notFound();

  // For public entities use the user's recent workspace
  if (entity.authorized_public) {
    const { data: workspace, error } = await tryCatch(resolveWorkspace());
    if (!workspace || error || !workspace.virtualLab || !workspace.project) notFound();

    const redirectCtx = {
      virtualLabId: workspace.virtualLab.id,
      projectId: workspace.project.id,
    };

    if (workspace.recentWorkspace) {
      redirectCtx.virtualLabId = workspace.recentWorkspace.virtual_lab_id;
      redirectCtx.projectId = workspace.recentWorkspace.project_id;
    }

    redirect(
      resolveExploreDetailsPageUrl2({ ctx: redirectCtx, entityId: id, dataType: entity.type })
    );
  }

  // For private entities, check if the user is a member of the entity's "authorized_project_id"

  const { data: groups, error } = await tryCatch(getUserGroups);

  if (!groups?.data?.groups ?? error) notFound();

  const group = groups.data.groups.find((g) => g.project_id === entity.authorized_project_id);
  if (!group) notFound();

  redirect(
    resolveExploreDetailsPageUrl2({
      ctx: { virtualLabId: group.virtual_lab_id, projectId: entity.authorized_project_id },
      entityId: id,
      dataType: entity.type,
    })
  );
}
