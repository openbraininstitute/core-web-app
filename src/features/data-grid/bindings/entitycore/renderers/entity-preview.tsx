import { hasAssets } from '@/api/entitycore/guards';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type {
  AssetLabel,
  EntityCoreIdentifiable,
  EntityCoreResource,
} from '@/api/entitycore/types/shared/global';
import type {
  TEntityAssetTarget,
  TThumbnailServiceTarget,
} from '@/entity-configuration/definitions/renderer';
import type { ICellRendererProps } from '../../../react';

/** Cell-renderer registry key for the shared entity preview thumbnail. */
export const ENTITY_PREVIEW_RENDERER = 'entityPreview';

/** `cellRendererParams` selecting the thumbnail source; omitted means the thumbnail service. */
export interface IEntityPreviewParams {
  target?: TThumbnailServiceTarget | TEntityAssetTarget;
  assetLabel?: AssetLabel;
}

/**
 * Shared preview-thumbnail cell for any entity carrying assets. Entities register it
 * under {@link ENTITY_PREVIEW_RENDERER} and reference that key from a preview column.
 */
export function EntityPreview({ row, params }: ICellRendererProps<EntityCoreIdentifiable>) {
  if (!row || !hasAssets(row as unknown as EntityCoreObjectTypes)) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
        No preview
      </div>
    );
  }

  const { target, assetLabel } = (params ?? {}) as IEntityPreviewParams;
  const entity = row as unknown as EntityCoreResource;
  const shared = {
    width: 184,
    height: 108,
    className: 'rounded border border-gray-100 bg-white object-contain',
    rootClassName: 'preview-thumbnail-root my-1 h-full w-full',
  } as const;

  if (target === 'assetLabel') {
    if (assetLabel) {
      return (
        <PreviewThumbnail entity={entity} target="assetLabel" label={assetLabel} {...shared} />
      );
    }
    return <PreviewThumbnail entity={entity} {...shared} />;
  }
  return <PreviewThumbnail entity={entity} target={target} {...shared} />;
}
