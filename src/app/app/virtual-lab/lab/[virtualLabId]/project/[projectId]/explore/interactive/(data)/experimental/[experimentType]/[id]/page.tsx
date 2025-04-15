'use client';

import { Suspense } from 'react';
import { notFound, useParams } from 'next/navigation';

import { EXPERIMENT_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/experiment-data-types';
import { DataType } from '@/constants/explore-section/list-views';
import MorphologyDetailView from '@/components/explore-section/reconstruction-morphology/detail-view';
import Detail from '@/components/explore-section/Detail';
import { ExperimentalTrace } from '@/types/explore-section/delta-experiment';
import EphysViewerContainer from '@/components/explore-section/EphysViewerContainer';
import {
  BOUTON_DENSITY_FIELDS,
  ELECTRO_PHYSIOLOGY_FIELDS,
  NEURON_DENSITY_FIELDS,
  SYNAPSE_PER_CONNECTION_FIELDS,
} from '@/constants/explore-section/detail-views-fields';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';

export default function ExperimentDetailViewPage() {
  const params = useParams<{ experimentType: string }>();

  const currentExperiment = Object.keys(EXPERIMENT_DATA_TYPE_CONFIG).find(
    (key) => EXPERIMENT_DATA_TYPE_CONFIG[key].name === params?.experimentType
  );

  if (!currentExperiment) notFound();
  let content;
  // based on the experiment type, decide what kind of content will be rendered
  switch (currentExperiment) {
    case DataType.ExperimentalNeuronMorphology:
      content = <MorphologyDetailView />;
      break;
    case DataType.ExperimentalElectroPhysiology:
      content = (
        <Detail<ExperimentalTrace>
          dataType={DataType.ExperimentalElectroPhysiology}
          fields={ELECTRO_PHYSIOLOGY_FIELDS}
        >
          {(detail) => <EphysViewerContainer resource={detail} />}
        </Detail>
      );
      break;
    case DataType.ExperimentalBoutonDensity:
      content = (
        <Detail dataType={DataType.ExperimentalBoutonDensity} fields={BOUTON_DENSITY_FIELDS} />
      );
      break;
    case DataType.ExperimentalNeuronDensity:
      content = (
        <Detail dataType={DataType.ExperimentalNeuronDensity} fields={NEURON_DENSITY_FIELDS} />
      );
      break;
    case DataType.ExperimentalSynapsePerConnection:
      content = (
        <Detail
          dataType={DataType.ExperimentalNeuronDensity}
          fields={SYNAPSE_PER_CONNECTION_FIELDS}
        />
      );
      break;
    default:
      content = null;
      break;
  }
  return <Suspense fallback={<CentralLoadingSpinner />}>{content}</Suspense>;
}
