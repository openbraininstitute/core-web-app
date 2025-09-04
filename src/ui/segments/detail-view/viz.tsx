'use client';

import { JSX } from 'react';
import { notFound } from 'next/navigation';
import { MorphoViewerLoaderMemo } from '@/features/entities/reconstruction-morphology/detail-view';
import { IReconstructionMorphology, IElectricalCellRecording } from '@/api/entitycore/types';
import EphysViewer from '@/features/ephys-viewer';

import { downloadEntity } from '@/app/app/v2/[virtualLabId]/[projectId]/data/view/[type]/[id]/layout';
import { WorkspaceContext } from '@/types/common';

type AwaitedType<T> = T extends Promise<infer U> ? U : T;
export default function Visualization({
  entity,
  ctx,
}: {
  entity: AwaitedType<ReturnType<typeof downloadEntity>>;
  ctx: WorkspaceContext;
}) {
  let content: JSX.Element | undefined;

  if (entity.type === 'reconstruction_morphology') {
    content = <MorphoViewerLoaderMemo resource={entity as IReconstructionMorphology} />;
  }
  if (entity.type === 'electrical_cell_recording') {
    content = <EphysViewer resource={entity as IElectricalCellRecording} ctx={ctx} />;
  }

  if (!content) notFound();
  return <>{content}</>;
}
