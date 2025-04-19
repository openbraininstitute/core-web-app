'use client';

import { Suspense } from 'react';

import { DataType } from '@/constants/explore-section/list-views';

import EphysViewerContainer from '@/components/explore-section/EphysViewerContainer';
import Summary from '@/components/explore-section/details-view/summary';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';

export default function EphysDetailPage() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary dataType={DataType.ExperimentalElectroPhysiology}>
        {(detail) => <EphysViewerContainer resource={detail} />}
      </Summary>
    </Suspense>
  );
}
