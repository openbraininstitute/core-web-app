'use client';

import { MorphoViewerLoaderMemo } from '@/features/entities/reconstruction-morphology/detail-view';
import { IReconstructionMorphology, IElectricalCellRecording } from '@/api/entitycore/types';
import EphysViewer from '@/features/ephys-viewer';

import { downloadEntity } from '@/app/app/v2/[virtualLabId]/[projectId]/explore/view/[type]/[id]/layout';
import { WorkspaceContext } from '@/types/common';

type AwaitedType<T> = T extends Promise<infer U> ? U : T;
export default function Visualization({
  entity,
  ctx,
}: {
  entity: AwaitedType<ReturnType<typeof downloadEntity>>['entity'];
  ctx: WorkspaceContext;
}) {
  if (entity.type === 'reconstruction_morphology') {
    return <MorphoViewerLoaderMemo resource={entity as IReconstructionMorphology} />;
  }
  if (entity.type === 'electrical_cell_recording') {
    return <EphysViewer resource={entity as IElectricalCellRecording} ctx={ctx} />;
  }

  return null;
}
