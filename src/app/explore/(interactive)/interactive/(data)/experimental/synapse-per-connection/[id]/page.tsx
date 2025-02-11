'use client';

import { Suspense } from 'react';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/components/explore-section/details-view/summary';
import { SYNAPSE_PER_CONNECTION_FIELDS } from '@/constants/explore-section/detail-views-fields';

export default function SynapsePerConnectionDetailPage() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary fields={SYNAPSE_PER_CONNECTION_FIELDS} />
    </Suspense>
  );
}
