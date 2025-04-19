'use client';

import { Suspense } from 'react';

import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/components/explore-section/details-view/summary';

import { DataType } from '@/constants/explore-section/list-views';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';

export default function SynapsePerConnectionDetailPage() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary<IExperimentalSynapsesPerConnection>
        dataType={DataType.ExperimentalSynapsePerConnection}
      />
    </Suspense>
  );
}
