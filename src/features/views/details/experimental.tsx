'use client';

import { notFound, useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { Suspense } from 'react';

import MorphologyDetailView from '@/features/entities/cell-morphology/detail-view';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/features/details-view/summary';
import EphysViewer from '@/features/ephys-viewer';

import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { DataType } from '@/constants/explore-section/list-views';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { ExperimentalEntitySlugValue } from '@/entity-configuration/domain/slug';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import { WorkspaceContext } from '@/types/common';

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
        legacyType: DataType.ExperimentalNeuronMorphology,
      },
      () => (
        <Summary dataType={DataType.ExperimentalNeuronMorphology}>
          {(detail) => <MorphologyDetailView detail={detail as ICellMorphology} />}
        </Summary>
      )
    )
    .with({ legacyType: DataType.ExperimentalElectroPhysiology }, () => (
      <Summary dataType={DataType.ExperimentalElectroPhysiology}>
        {(detail) => <EphysViewer resource={detail as IElectricalCellRecording} ctx={ctx} />}
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
      (dataType) => <Summary dataType={dataType} />
    )
    .otherwise(() => null);

  return <Suspense fallback={<CentralLoadingSpinner />}>{content}</Suspense>;
}
