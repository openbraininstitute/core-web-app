import { redirect, notFound } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { resolveWorkspace } from '@/ui/segments/app-setup/helpers';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { EntityTypeDict, TEntityTypeDict } from '@/api/entitycore/types';
import { tryCatch } from '@/api/utils';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { WorkspaceContext } from '@/types/common';

async function retrieveCircuit({
  id,
  type,
  context,
}: {
  id: string;
  type: TEntityTypeDict;
  context?: WorkspaceContext;
}) {
  if (type === EntityTypeDict.Circuit) {
    const circuit = await getCircuit({ id, context });

    if (circuit.scale === CircuitScaleDictionary.Single)
      return ExtendedEntitiesTypeDict.MEModelWithSynapses;
  }
  return type;
}

export default async function EntityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: entity, error: entityError } = await tryCatch(() => getEntity({ id }));
  if (!entity || entityError) notFound();

  let entityType: TExtendedEntitiesTypeDict = entity.type;

  // For public entities use the most recent workspace
  if (entity.authorized_public) {
    const { data: workspace, error: workspaceError } = await tryCatch(resolveWorkspace());
    if (!workspace || workspaceError || !workspace.virtualLab || !workspace.project) notFound();

    const redirectCtx = {
      virtualLabId: workspace.virtualLab.id,
      projectId: workspace.project.id,
    };

    if (workspace.recentWorkspace) {
      redirectCtx.virtualLabId = workspace.recentWorkspace.virtual_lab_id;
      redirectCtx.projectId = workspace.recentWorkspace.project_id;
    }
    // NOTE: circuit with scale "single" needs to be redirected to MEModelWithSynapses
    // as it has a different details page
    entityType = await retrieveCircuit({ id, type: entity.type });

    const redirectUrl = resolveExploreDetailsPageUrl({
      ctx: redirectCtx,
      entityId: id,
      dataType: entityType,
    });

    redirect(`${redirectUrl}/overview`);
  }

  // Find out the virtual lab for the "authorized_project_id" for private entities
  const { data: groups, error } = await tryCatch(getUserGroups);

  if (!groups?.data?.groups || error) notFound();

  const group = groups.data.groups.find((g) => g.project_id === entity.authorized_project_id);
  if (!group) notFound();

  if (entity.type === EntityTypeDict.Circuit && group.virtual_lab_id && group.project_id) {
    const { virtual_lab_id: virtualLabId, project_id: projectId } = group;
    entityType = await retrieveCircuit({
      id,
      type: entity.type,
      context: { virtualLabId, projectId },
    });
  }

  const redirectUrl = resolveExploreDetailsPageUrl({
    ctx: { virtualLabId: group.virtual_lab_id, projectId: group.project_id },
    entityId: id,
    dataType: entityType,
  });

  redirect(`${redirectUrl}/overview`);
}
