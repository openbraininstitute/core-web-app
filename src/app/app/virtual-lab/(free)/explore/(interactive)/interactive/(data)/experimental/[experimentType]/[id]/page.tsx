'use client';

import { Suspense } from 'react';
import { notFound, useParams } from 'next/navigation';

import MorphologyDetailView from '@/features/entities/reconstruction-morphology/detail-view';
import EphysViewer from '@/components/explore-section/ephys-viewer';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/features/details-view/summary';

import { getViewDefinitionDataTypeByName } from '@/entity-configuration/definitions/view-defs';
import { DataType } from '@/constants/explore-section/list-views';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';
import type { TExperimentTypeNames } from '@/entity-configuration/domain/experimental';

export default function ExperimentDetailViewPage() {
  const params = useParams<{ experimentType: string }>();

  const currentExperiment = getViewDefinitionDataTypeByName(
    params?.experimentType as TExperimentTypeNames
  );

  if (!currentExperiment) notFound();
  let content;
  // based on the experiment type, decide what kind of content will be rendered
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
          {(detail) => <EphysViewer resource={detail} />}
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
