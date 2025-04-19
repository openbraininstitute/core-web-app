'use client';

import { Suspense } from 'react';

import MorphologyDetailView from '@/components/explore-section/reconstruction-morphology/detail-view';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import Summary from '@/components/explore-section/details-view/summary';
import { DataType } from '@/constants/explore-section/list-views';

import type { IReconstructionMorphology } from '@/api/entitycore/types/entities/reconstruction-morphology';

export default function MorphologyDetailPage() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary dataType={DataType.ExperimentalNeuronMorphology}>
        {(detail) => <MorphologyDetailView detail={detail as IReconstructionMorphology} />}
      </Summary>
    </Suspense>
  );
}
