import { hasAssets } from '@/api/entitycore/guards';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type {
  EntityCoreIdentifiable,
  EntityCoreResource,
} from '@/api/entitycore/types/shared/global';
import type { ICellRendererProps } from '../../../react';

/** Cell-renderer registry key for the shared entity preview thumbnail. */
export const ENTITY_PREVIEW_RENDERER = 'entityPreview';

/**
 * Shared preview-thumbnail cell for any entity carrying assets. Entities register it
 * under {@link ENTITY_PREVIEW_RENDERER} and reference that key from a preview column.
 */
export function EntityPreview({ row }: ICellRendererProps<EntityCoreIdentifiable>) {
  if (!row || !hasAssets(row as unknown as EntityCoreObjectTypes)) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
        No preview
      </div>
    );
  }
  return (
    <PreviewThumbnail
      entity={row as unknown as EntityCoreResource}
      width={184}
      height={108}
      className="rounded border border-gray-100 bg-white object-contain"
      rootClassName="preview-thumbnail-root my-1 h-full w-full"
    />
  );
}
