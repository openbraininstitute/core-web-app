'use client';

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { match, P } from 'ts-pattern';

import MorphologyDetailView from '@/features/entities/reconstruction-morphology/detail-view';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import EphysViewer from '@/features/ephys-viewer';
import Summary from '@/features/details-view/summary';

import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { DataType } from '@/constants/explore-section/list-views';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { ExperimentalEntitySlugValue } from '@/entity-configuration/domain/slug';

type Props = {
  type: ExperimentalEntitySlugValue;
};

export default function DetailView({ type }: Props) {
  const entity = getEntityBySlug({ slug: type });
  if (!entity) notFound();

  const content = match<EntityCoreTypeConfig<any>>(entity)
    .with(
      {
        legacyType: DataType.ExperimentalNeuronMorphology,
      },
      () => (
        <Summary dataType={DataType.ExperimentalNeuronMorphology}>
          {(detail) => <MorphologyDetailView detail={detail as IReconstructionMorphology} />}
        </Summary>
      )
    )
    .with({ legacyType: DataType.ExperimentalElectroPhysiology }, () => (
      <Summary dataType={DataType.ExperimentalElectroPhysiology}>
        {(detail) => <EphysViewer resource={detail as IElectricalCellRecording} />}
      </Summary>
    ))
    .with(
      {
        legacyType: P.union(
          DataType.ExperimentalSynapsePerConnection,
          DataType.ExperimentalBoutonDensity,
          DataType.ExperimentalNeuronDensity
        ).select(),
      },
      (type) => <Summary dataType={type} />
    )
    .otherwise(() => null);

  return <Suspense fallback={<CentralLoadingSpinner />}>{content}</Suspense>;
}
