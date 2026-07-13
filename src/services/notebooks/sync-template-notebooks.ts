import {
  createAnalysisNotebookTemplate,
  getAnalysisNotebookTemplate,
  getAnalysisNotebookTemplates,
} from '@/api/entitycore/queries/analysis-notebook-template';
import { deleteAsset, downloadAsset, getAssets } from '@/api/entitycore/queries/assets';
import { uploadNotebookTemplateFile } from '@/api/entitycore/queries/experimental/analysis-notebook-template';
import {
  createContribution,
  deleteContribution,
  getContributions,
} from '@/api/entitycore/queries/general/contribution';
import { fetchAllPaginatedData } from '@/utils/pagination';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { AssetContentType } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

/**
 * Syncs a single notebook (assets + contributions) to a list of target projects.
 * For each target: find-or-create notebook, wipe+reupload assets, diff contributions.
 */
export async function syncNotebookToProjects({
  virtualLabId,
  templateProjectId,
  templateEntityId,
  entityType,
  notebookName,
  targetProjectIds,
  onProgress,
}: {
  virtualLabId: string;
  templateProjectId: string;
  templateEntityId: string;
  entityType: EntityCoreObjectTypes['type'];
  notebookName: string;
  targetProjectIds: string[];
  onProgress?: (completed: number, total: number) => void;
}) {
  const templateCtx: WorkspaceContext = { virtualLabId, projectId: templateProjectId };

  const [templateEntity, templateAssets, templateContribs] = await Promise.all([
    getAnalysisNotebookTemplate({ id: templateEntityId, context: templateCtx }),
    getAssets({ entityType, entityId: templateEntityId, ctx: templateCtx }),
    getContributions({ context: templateCtx, filters: { entity__id: templateEntityId } }),
  ]);

  const templateFiles = await Promise.all(
    templateAssets.data.map(async (asset) => {
      const response = await downloadAsset({
        ctx: templateCtx,
        entityType,
        entityId: templateEntityId,
        id: asset.id,
        asRawResponse: true,
      });
      const blob = await response.blob();
      const file = new File([blob], asset.path, { type: asset.content_type });
      return { file, contentType: asset.content_type as AssetContentType, label: asset.label };
    })
  );

  const total = targetProjectIds.length;
  let completed = 0;
  let failures = 0;

  onProgress?.(0, total);

  for (const pid of targetProjectIds) {
    try {
      const childCtx: WorkspaceContext = { virtualLabId, projectId: pid };
      const res = await getAnalysisNotebookTemplates({
        filters: { search: notebookName },
        context: childCtx,
      });
      const match = res.data.find((nb) => nb.name === notebookName);
      const targetId = match
        ? match.id
        : (await createAnalysisNotebookTemplate({ payload: templateEntity, context: childCtx })).id;

      // Assets: wipe and re-upload
      const childAssets = await getAssets({ entityType, entityId: targetId, ctx: childCtx });
      await Promise.all(
        childAssets.data.map((a) =>
          deleteAsset({ entityType, entityId: targetId, id: a.id, ctx: childCtx })
        )
      );
      for (const { file, contentType, label } of templateFiles) {
        await uploadNotebookTemplateFile({
          context: childCtx,
          entityId: targetId,
          file,
          contentType,
          assetLabel: label,
        });
      }

      // Contributions: diff
      const childContribs = await getContributions({
        context: childCtx,
        filters: { entity__id: targetId },
      });

      const toDelete = childContribs.data.filter(
        (cc) =>
          !templateContribs.data.some(
            (tc) => tc.agent.id === cc.agent.id && tc.role.id === cc.role.id
          )
      );
      await Promise.all(toDelete.map((c) => deleteContribution({ id: c.id, context: childCtx })));

      const toCreate = templateContribs.data.filter(
        (tc) =>
          !childContribs.data.some((cc) => cc.agent.id === tc.agent.id && cc.role.id === tc.role.id)
      );
      await Promise.all(
        toCreate.map((tc) =>
          createContribution({
            context: childCtx,
            contributor: { agent_id: tc.agent.id, role_id: tc.role.id, entity_id: targetId },
          })
        )
      );
    } catch (_) {
      failures++;
    }
    completed++;
    onProgress?.(completed, total);
  }

  if (failures > 0) {
    throw new Error(`Failed to sync ${failures} child project(s)`);
  }
}

export interface NotebookSyncFailure {
  id: string;
  name: string;
  error: unknown;
}

/**
 * Syncs all notebooks from a template project to multiple student projects.
 * Returns a list of notebooks that failed to sync (empty if all succeeded).
 */
export async function syncTemplateNotebooksToStudents({
  templateProjectId,
  studentProjectIds,
  context,
  onProgress,
}: {
  templateProjectId: string;
  studentProjectIds: string[];
  context: WorkspaceContext;
  onProgress?: (completed: number, total: number) => void;
}): Promise<NotebookSyncFailure[]> {
  if (studentProjectIds.length === 0) return [];

  const allNotebooks = await fetchAllPaginatedData({
    fn: (page, pageSize) =>
      getAnalysisNotebookTemplates({
        filters: {
          page,
          page_size: pageSize,
          authorized_project_id: templateProjectId,
          authorized_public: false,
        },
        context: { ...context, projectId: templateProjectId },
      }),
    pageSize: 100,
  });

  const failures: NotebookSyncFailure[] = [];
  const total = allNotebooks.length;
  let completed = 0;

  onProgress?.(0, total);

  for (const notebook of allNotebooks) {
    try {
      await syncNotebookToProjects({
        virtualLabId: context.virtualLabId,
        templateProjectId,
        templateEntityId: notebook.id,
        entityType: notebook.type,
        notebookName: notebook.name,
        targetProjectIds: studentProjectIds,
      });
    } catch (error) {
      failures.push({ id: notebook.id, name: notebook.name, error });
    }
    completed++;
    onProgress?.(completed, total);
  }

  return failures;
}
