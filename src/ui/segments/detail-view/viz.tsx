'use client';

import { notFound } from 'next/navigation';
import { MorphoViewerLoaderMemo } from '@/features/entities/reconstruction-morphology/detail-view';
import { IReconstructionMorphology, IElectricalCellRecording } from '@/api/entitycore/types';
import EphysViewer from '@/features/ephys-viewer';
import CircuitViz from '@/features/entities/circuit/elements/tabs-content/visualization';

import { downloadEntity } from '@/app/app/v2/[virtualLabId]/[projectId]/data/view/[type]/[id]/layout';
import { WorkspaceContext } from '@/types/common';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';

type AwaitedType<T> = T extends Promise<infer U> ? U : T;

export default function Visualization({
  entity,
  ctx,
}: {
  entity: AwaitedType<ReturnType<typeof downloadEntity>>;
  ctx: WorkspaceContext;
}) {
  if (entity.type === 'reconstruction_morphology') {
    return <MorphoViewerLoaderMemo resource={entity as IReconstructionMorphology} />;
  }
  if (entity.type === 'electrical_cell_recording') {
    return <EphysViewer resource={entity as IElectricalCellRecording} ctx={ctx} />;
  }
  if (entity.type === 'circuit') {
    return <CircuitViz circuit={entity as ICircuit} />;
  }

  notFound();
}
