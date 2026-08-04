import { hasAssets } from '@/api/entitycore/guards';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { ICellRendererProps } from '../../../react';

/** Cell-morphology preview thumbnail, backed by the lazy {@link PreviewThumbnail}. */
export function CellMorphologyPreview({ row }: ICellRendererProps<ICellMorphology>) {
  if (!row || !hasAssets(row)) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
        No preview
      </div>
    );
  }
  return (
    <PreviewThumbnail
      entity={row}
      width={184}
      height={108}
      className="rounded border border-gray-100 object-contain bg-white"
      rootClassName="h-full w-full preview-thumbnail-root my-1"
    />
  );
}
