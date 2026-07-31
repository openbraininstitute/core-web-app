import { NotebookPreviewThumbnail } from '@/features/notebooks/components/notebook-preview-thumbnail';

import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { CellRendererProps } from '../../../react';

/** Cell-renderer registry key for the notebook-result image preview. */
export const NOTEBOOK_IMAGE_PREVIEW_RENDERER = 'notebookImagePreview';

/**
 * Notebook-result image preview. Reuses the legacy {@link NotebookPreviewThumbnail}
 * (lazy, in-view figure loader) exactly as the `NotebookImagePreview` field-def did,
 * so the AG Grid listing shows the same notebook figures as the antd table.
 */
export function NotebookImagePreview({ row }: CellRendererProps<IAnalysisNotebookResult>) {
  if (!row) return null;
  return (
    <NotebookPreviewThumbnail
      record={row as unknown as Parameters<typeof NotebookPreviewThumbnail>[0]['record']}
    />
  );
}
