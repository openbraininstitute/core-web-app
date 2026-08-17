import { hasAssets } from '@/api/entitycore/guards';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the ME-model morphology preview thumbnail. */
export const MEMODEL_MORPHOLOGY_PREVIEW_RENDERER = 'memodelMorphologyPreview';

/** Cell-renderer registry key for the ME-model trace preview thumbnail. */
export const MEMODEL_TRACE_PREVIEW_RENDERER = 'memodelTracePreview';

/**
 * ME-model morphology preview. Unlike the shared {@link EntityPreview}, this previews
 * the nested `morphology` sub-entity, not the row entity itself.
 */
export function MEModelMorphologyPreview({ row }: ICellRendererProps<IMEModel>) {
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

/** ME-model trace preview: the row entity itself, with no `hasAssets` gate — `GET /memodel` returns no `assets` on the row. */
export function MEModelTracePreview({ row }: ICellRendererProps<IMEModel>) {
  if (!row) {
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
