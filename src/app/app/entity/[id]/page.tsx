import { redirect, notFound } from 'next/navigation';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { resolveExploreDetailsPageUrl2 } from '@/utils/url-builder';
import { tryCatch } from '@/api/utils';
import { resolveWorkspace } from '@/ui/segments/app-setup/helpers';

export default async function EntityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  const { data: entity, error: entityError } = await tryCatch(() => getEntity({ id }));

  if (!entity || entityError) notFound();

  redirect(
    resolveExploreDetailsPageUrl2({ ctx: redirectCtx, entityId: id, dataType: entity.type })
  );
}
