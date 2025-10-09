'use client';

import { notFound, useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { Suspense } from 'react';

import { CellMorphologyViewer } from '@/features/entities/cell-morphology/detail-view';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/features/details-view/summary';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { EphysViewer } from '@/features/ephys-viewer';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
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
        extendedType: ExtendedEntitiesTypeDict.CellMorphology,
      },
      () => (
        <Summary dataType={ExtendedEntitiesTypeDict.CellMorphology}>
          {(detail) => <CellMorphologyViewer entity={detail as ICellMorphology} />}
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
