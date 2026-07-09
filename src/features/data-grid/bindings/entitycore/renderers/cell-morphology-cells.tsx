import { hasAssets } from '@/api/entitycore/guards';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { CellRendererProps } from '../../../react';

/**
 * Cell-morphology preview thumbnail. Reuses the shared, lazy-loading
 * {@link PreviewThumbnail} (asset/thumbnail-service backed) — the same renderer the
 * legacy table used — so previews are fully functional, not placeholders.
 */
export function CellMorphologyPreview({ row }: CellRendererProps<ICellMorphology>) {
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
      className="rounded border border-neutral-3 object-contain"
      rootClassName="h-full w-full"
    />
  );
}
