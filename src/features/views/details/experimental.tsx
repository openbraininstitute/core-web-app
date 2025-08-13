'use client';

import { notFound, useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { Suspense } from 'react';

import MorphologyDetailView from '@/features/entities/reconstruction-morphology/detail-view';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/features/details-view/summary';
import EphysViewer from '@/features/ephys-viewer';

import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ExperimentalEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  type: ExperimentalEntitySlugValue;
};

export default function DetailView({ type }: Props) {
  const entity = getEntityBySlug({ slug: type });
  if (!entity) notFound();

  const ctx = useParams<WorkspaceContext>();

  const content = match<EntityCoreTypeConfig<any>>(entity)
    .with(
      {
        extendedType: ExtendedEntitiesTypeDict.ReconstructionMorphology,
      },
      () => (
        <Summary dataType={ExtendedEntitiesTypeDict.ReconstructionMorphology}>
          {(detail) => <MorphologyDetailView detail={detail as IReconstructionMorphology} />}
        </Summary>
      )
    )
    .with({ extendedType: ExtendedEntitiesTypeDict.ElectricalCellRecording }, () => (
      <Summary dataType={ExtendedEntitiesTypeDict.ElectricalCellRecording}>
        {(detail) => <EphysViewer resource={detail as IElectricalCellRecording} ctx={ctx} />}
      </Summary>
    ))
    .with(
      {
        extendedType: P.union(
          ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
          ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
          ExtendedEntitiesTypeDict.ExperimentalNeuronDensity
        ).select(),
      },
      (dataType) => <Summary dataType={dataType} />
    )
    .otherwise(() => null);

  return <Suspense fallback={<CentralLoadingSpinner />}>{content}</Suspense>;
}
