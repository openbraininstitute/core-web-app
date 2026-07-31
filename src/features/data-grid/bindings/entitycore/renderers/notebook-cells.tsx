import { NotebookPreviewThumbnail } from '@/features/notebooks/components/notebook-preview-thumbnail';

import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { ICellRendererProps } from '../../../react';

/** Cell-renderer registry key for the notebook-result image preview. */
export const NOTEBOOK_IMAGE_PREVIEW_RENDERER = 'notebookImagePreview';

/**
 * Notebook-result image preview. Reuses the legacy {@link NotebookPreviewThumbnail}
 * (lazy, in-view figure loader) exactly as the `NotebookImagePreview` field-def did,
 * so the AG Grid listing shows the same notebook figures as the antd table.
 */
export function NotebookImagePreview({ row }: ICellRendererProps<IAnalysisNotebookResult>) {
  // same empty state the other preview cells use — a preview column never goes blank
  if (!row) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
        No preview
      </div>
    );
  }
  return (
    <NotebookPreviewThumbnail
      record={row as unknown as Parameters<typeof NotebookPreviewThumbnail>[0]['record']}
    />
  );
}
