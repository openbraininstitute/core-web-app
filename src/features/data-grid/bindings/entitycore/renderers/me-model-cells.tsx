import { hasAssets } from '@/api/entitycore/guards';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { CellRendererProps } from '../../../react';

/** Cell-renderer registry key for the ME-model morphology preview thumbnail. */
export const MEMODEL_MORPHOLOGY_PREVIEW_RENDERER = 'memodelMorphologyPreview';

/**
 * ME-model morphology preview. Unlike the shared {@link EntityPreview} (which
 * previews the row entity itself), the ME-model listing's "Morphology" column
 * previews the NESTED `morphology` sub-entity (an `ICellMorphology`), mirroring the
 * legacy `MEModelMorphologyPreview` field-def. Reuses the same lazy, asset-backed
 * {@link PreviewThumbnail} so previews stay fully functional, not placeholders.
 */
export function MEModelMorphologyPreview({ row }: CellRendererProps<IMEModel>) {
  const morphology = row?.morphology;
  if (!morphology || !hasAssets(morphology)) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
        No preview
      </div>
    );
  }
  return (
    <PreviewThumbnail
      entity={morphology}
      width={184}
      height={108}
      className="rounded border border-gray-100 bg-white object-contain"
      rootClassName="preview-thumbnail-root my-1 h-full w-full"
    />
  );
}
