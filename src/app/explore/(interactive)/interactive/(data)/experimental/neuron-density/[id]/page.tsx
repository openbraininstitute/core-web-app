'use client';

import { Suspense } from 'react';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/components/explore-section/details-view/summary';
import { NEURON_DENSITY_FIELDS } from '@/constants/explore-section/detail-views-fields';

export default function NeuronDensityDetailPage() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary fields={NEURON_DENSITY_FIELDS} />
    </Suspense>
  );
}
