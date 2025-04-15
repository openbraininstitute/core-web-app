'use client';

import { Suspense } from 'react';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/components/explore-section/details-view/summary';
import { ExperimentalTrace } from '@/types/explore-section/delta-experiment';
import EphysViewerContainer from '@/components/explore-section/EphysViewerContainer';
import { ELECTRO_PHYSIOLOGY_FIELDS } from '@/constants/explore-section/detail-views-fields';

export default function EphysDetailPage() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary<ExperimentalTrace> fields={ELECTRO_PHYSIOLOGY_FIELDS}>
        {(detail) => <EphysViewerContainer resource={detail} />}
      </Summary>
    </Suspense>
  );
}
