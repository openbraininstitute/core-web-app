import { getAnalysisNotebookTemplates } from '@/api/entitycore/queries/analysis-notebook-template';
import { syncNotebook } from '@/services/notebooks';
import { fetchAllPaginatedData } from '@/utils/pagination';

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
