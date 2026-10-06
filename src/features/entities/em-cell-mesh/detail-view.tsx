'use client';

import { ViewerCard } from '@/features/viewer-3d/viewer-card';

import { EmCellMeshViewer } from './viewer/em-mesh-viewer';

import type { IAsset } from '@/api/entitycore/types/shared/global';

export function EmCellMeshViewerCard(props: {
  entity: { id: string; name: string };
  asset: IAsset;
}) {
  return (
    <ViewerCard error="Error while loading the mesh viewer">
      <EmCellMeshViewer className="h-full" {...props} />
    </ViewerCard>
  );
}
