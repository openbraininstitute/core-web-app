'use client';

import dynamic from 'next/dynamic';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { ComponentType } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export type InteractiveViewerProps = { record: EntityCoreObjectTypes };

type TInteractiveViewer = {
  Viewer: ComponentType<InteractiveViewerProps>;
  /** fills the card's free space (a canvas), or takes its content's height and the card scrolls */
  sizing: 'fill' | 'content';
};

/** Live viewers a mini-detail card shows in place of its thumbnail where the host has room. */
const INTERACTIVE_VIEWERS: Partial<Record<TExtendedEntitiesTypeDict, TInteractiveViewer>> = {
  [ExtendedEntitiesTypeDict.EMCellMesh]: {
    Viewer: dynamic(
      () =>
        import('@/features/entities/em-cell-mesh/preview-viewer').then(
          (m) => m.EmCellMeshPreviewViewer
        ),
      { ssr: false }
    ),
    sizing: 'fill',
  },
  [ExtendedEntitiesTypeDict.IonChannelRecording]: {
    Viewer: dynamic(
      () =>
        import('@/features/scan-config/components/model-preview/ion-channel-recording-viewer').then(
          (m) => m.IonChannelRecordingPreviewViewer
        ),
      { ssr: false }
    ),
    sizing: 'content',
  },
};

export function resolveInteractiveViewer(
  type: TExtendedEntitiesTypeDict | null | undefined
): TInteractiveViewer | null {
  return (type && INTERACTIVE_VIEWERS[type]) || null;
}
