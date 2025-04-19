'use client';

import { Suspense } from 'react';

import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/components/explore-section/details-view/summary';

import { DataType } from '@/constants/explore-section/list-views';
import type { IExperimentalNeuronDensity } from '@/api/entitycore/types/entities/neuron-density';

export default function NeuronDensityDetailPage() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary<IExperimentalNeuronDensity> dataType={DataType.ExperimentalNeuronDensity} />
    </Suspense>
  );
}
