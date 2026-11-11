'use client';

import { useEffect } from 'react';

import {
  ScanConfigEntityPreviewOrigin,
  useScanConfigEntityPreview,
  useSetScanConfigEntityPreview,
} from '@/features/scan-config/bridge/entity-preview';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * Keeps the preview on an entity of the config: the first one, unless the user picked another
 * that is still there, and clears it once the config is empty. Without `dataType` the preview is
 * left alone.
 */
export function usePinnedEntityPreview({
  dataType,
  ids,
}: {
  dataType: TExtendedEntitiesTypeDict | undefined;
  ids: readonly string[];
}) {
  const preview = useScanConfigEntityPreview();
  const setPreview = useSetScanConfigEntityPreview();
  const firstId = ids.at(0);
  const hasPreview = !!preview;
  const shownInConfig = hasPreview && ids.includes(preview.id);

  useEffect(() => {
    if (!dataType || shownInConfig) return;
    if (firstId) {
      setPreview({ dataType, id: firstId, origin: ScanConfigEntityPreviewOrigin.Selection });
    } else if (hasPreview) {
      setPreview(null);
    }
  }, [dataType, firstId, hasPreview, shownInConfig, setPreview]);
}
