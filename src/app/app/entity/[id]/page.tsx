import { notFound, redirect } from 'next/navigation';

import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import { getUserGroups } from '@/api/virtual-lab-svc/queries/user';
import { config } from '@/config';
import { resolveWorkspace } from '@/ui/segments/app-setup/helpers';
import { logError } from '@/utils/logger';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

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
      return ExtendedEntitiesTypeDict.SingleNeuronCircuit;
  }
  return type;
}

function resolveWorkspaceFromSearchParams(searchParams: {
  virtualLabId?: string;
  projectId?: string;
}): WorkspaceContext | null {
  const virtualLabId = searchParams.virtualLabId?.trim();
  const projectId = searchParams.projectId?.trim();
  if (!virtualLabId || !projectId) return null;
  return { virtualLabId, projectId };
}

export default async function EntityDetail({
  params,
  searchParams,
}: ServerSideComponentProp<{ id: string }, { virtualLabId?: string; projectId?: string }>) {
  const { id } = await params;
  const queryParams = await searchParams;
  const workspaceFromQuery = resolveWorkspaceFromSearchParams(queryParams);

  // Avoid the user's project headers — they can hide public entities owned elsewhere.
  // Fall back to the public project context if an unscoped lookup fails.
  const publicContext: WorkspaceContext = {
    virtualLabId: config.ENTITY_CORE_PUBLIC_VIRTUAL_LAB_ID,
    projectId: config.ENTITY_CORE_PUBLIC_PROJECT_ID,
  };

  let entity: IEntity | null = null;
  const unscoped = await tryCatch(getEntity({ id }));
  if (unscoped.data) {
    entity = unscoped.data;
  } else {
    const pub = await tryCatch(getEntity({ id, context: publicContext }));
    entity = pub.data;
    if (!entity) {
      const err = (pub.error ?? unscoped.error) as {
        cause?: { status?: number; code?: string; message?: string };
      } | null;
      logError(
        `Entity redirect lookup failed id=${id} status=${err?.cause?.status} code=${err?.cause?.code} message=${err?.cause?.message}`
      );
      notFound();
    }
  }

  let entityType: TExtendedEntitiesTypeDict = entity.type;

  // Prefer workspace from the referring page (e.g. project home get-started links).
  // Fall back to the user's resolved/recent workspace for bare /app/entity/:id URLs.
  let redirectCtx = workspaceFromQuery;

  if (!redirectCtx && entity.authorized_public) {
    const { data: workspace, error: workspaceError } = await tryCatch(resolveWorkspace());
    if (!workspace || workspaceError || !workspace.virtualLab || !workspace.project) notFound();

    redirectCtx = {
      virtualLabId: workspace.virtualLab.id,
      projectId: workspace.project.id,
    };

    if (workspace.recentWorkspace) {
      redirectCtx = {
        virtualLabId: workspace.recentWorkspace.virtual_lab_id,
        projectId: workspace.recentWorkspace.project_id,
      };
    }
  }

  if (redirectCtx) {
    // Resolve circuit scale with the same unscoped → public-project fallback.
    const unscopedType = await tryCatch(retrieveCircuit({ id, type: entity.type }));
    if (unscopedType.data) {
      entityType = unscopedType.data;
    } else {
      const publicType = await tryCatch(
        retrieveCircuit({ id, type: entity.type, context: publicContext })
      );
      entityType = publicType.data ?? entity.type;
    }

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
