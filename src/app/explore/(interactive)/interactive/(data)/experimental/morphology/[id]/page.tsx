'use client';

import { Suspense } from 'react';
import MorphologyDetailView from '@/components/explore-section/reconstruction-morphology/detail-view';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';

export default function MorphologyDetailPage() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <MorphologyDetailView />
    </Suspense>
  );
}
