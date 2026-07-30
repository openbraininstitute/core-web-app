import { hasAssets } from '@/api/entitycore/guards';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { CellRendererProps } from '../../../react';

/** Cell-renderer registry key for the shared entity preview thumbnail. */
export const ENTITY_PREVIEW_RENDERER = 'entityPreview';

/**
 * Shared preview-thumbnail cell for any entity that carries assets. Reuses the
 * same lazy `PreviewThumbnail` (asset / thumbnail-service backed) the legacy
 * listing used, so previews stay fully functional — not placeholders. Entities
 * register it under {@link ENTITY_PREVIEW_RENDERER} and reference it from their
 * preview column's `cellRenderer`.
 */
export function EntityPreview({ row }: CellRendererProps<EntityCoreIdentifiable>) {
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
      className="rounded border border-gray-100 bg-white object-contain"
      rootClassName="preview-thumbnail-root my-1 h-full w-full"
    />
  );
}
