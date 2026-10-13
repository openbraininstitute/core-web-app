'use client';

import dynamic from 'next/dynamic';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { ComponentType } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export type InteractiveViewerProps = { record: EntityCoreObjectTypes };

/** Live viewers a mini-detail card shows in place of its thumbnail where the host has room. */
const INTERACTIVE_VIEWERS: Partial<
  Record<TExtendedEntitiesTypeDict, ComponentType<InteractiveViewerProps>>
> = {
  [ExtendedEntitiesTypeDict.EMCellMesh]: dynamic(
    () =>
      import('@/features/entities/em-cell-mesh/preview-viewer').then(
        (m) => m.EmCellMeshPreviewViewer
      ),
    { ssr: false }
  ),
};

export function resolveInteractiveViewer(
  type: TExtendedEntitiesTypeDict | null | undefined
): ComponentType<InteractiveViewerProps> | null {
  return (type && INTERACTIVE_VIEWERS[type]) || null;
}
