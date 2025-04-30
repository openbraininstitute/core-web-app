'use client';

import { Suspense } from 'react';
import { notFound, useParams } from 'next/navigation';

import MorphologyDetailView from '@/features/entities/reconstruction-morphology/detail-view';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import EphysViewer from '@/features/ephys-viewer';
import Summary from '@/features/details-view/summary';

import { getViewDefinitionDataTypeByName } from '@/entity-configuration/definitions/view-defs';
import { DataType } from '@/constants/explore-section/list-views';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import type { TExperimentTypeNames } from '@/entity-configuration/domain/experimental';

export default function ExperimentDetailViewPage() {
  const params = useParams<{ experimentType: string }>();

  const currentExperiment = getViewDefinitionDataTypeByName(
    params?.experimentType as TExperimentTypeNames
  );

  if (!currentExperiment) notFound();
  let content;
  switch (currentExperiment) {
    case DataType.ExperimentalNeuronMorphology:
      content = (
        <Summary dataType={DataType.ExperimentalNeuronMorphology}>
          {(detail) => <MorphologyDetailView detail={detail as IReconstructionMorphology} />}
        </Summary>
      );
      break;
    case DataType.ExperimentalElectroPhysiology:
      content = (
        <Summary dataType={DataType.ExperimentalElectroPhysiology}>
          {(detail) => <EphysViewer resource={detail as IElectricalCellRecording} />}
        </Summary>
      );
      break;
    case DataType.ExperimentalSynapsePerConnection:
    case DataType.ExperimentalBoutonDensity:
    case DataType.ExperimentalNeuronDensity:
      content = <Summary dataType={currentExperiment} />;
      break;
    default:
      content = null;
      break;
  }
  return <Suspense fallback={<CentralLoadingSpinner />}>{content}</Suspense>;
}
