import { getAnalysisNotebookTemplates } from '@/api/entitycore/queries/analysis-notebook-template';
import { syncNotebook } from '@/services/notebooks';

import type { WorkspaceContext } from '@/types/common';

/**
 * Syncs all notebooks from a template project to multiple student projects
 * @param templateProjectId - The project ID containing the template notebooks
 * @param studentProjectIds - Array of student project IDs to sync notebooks to
 * @param context - Workspace context (virtualLabId, projectId)
 */
export async function syncTemplateNotebooksToStudents({
  templateProjectId,
  studentProjectIds,
  context,
}: {
  templateProjectId: string;
  studentProjectIds: string[];
  context: WorkspaceContext;
}) {
  if (studentProjectIds.length === 0) return;

  const allNotebooks = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await getAnalysisNotebookTemplates({
      filters: { page, page_size: pageSize },
      context: { ...context, projectId: templateProjectId },
    });

    const notebooks = response.data || [];
    allNotebooks.push(...notebooks);

    const pagination = response.pagination;
    hasMore = pagination && page * pageSize < pagination.total_items;
    page++;
  }

  if (allNotebooks.length === 0) return;

  await Promise.all(
    allNotebooks.map((notebook) =>
      syncNotebook({
        notebook,
        virtualLabId: context.virtualLabId,
        projectId: templateProjectId,
        targetProjectIds: studentProjectIds,
      })
    )
  );
}
