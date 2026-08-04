import { NotebookPreviewThumbnail } from '@/features/notebooks/components/notebook-preview-thumbnail';

import type { IAnalysisNotebookResult } from '@/api/entitycore/types/entities/analysis-notebook-result';
import type { ICellRendererProps } from '../../../react';

/** Cell-renderer registry key for the notebook-result image preview. */
export const NOTEBOOK_IMAGE_PREVIEW_RENDERER = 'notebookImagePreview';

/** Notebook-result image preview, backed by the lazy {@link NotebookPreviewThumbnail}. */
export function NotebookImagePreview({ row }: ICellRendererProps<IAnalysisNotebookResult>) {
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
