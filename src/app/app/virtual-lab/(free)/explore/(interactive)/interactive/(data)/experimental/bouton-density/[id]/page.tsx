'use client';

import { Suspense } from 'react';

import Summary from '@/components/explore-section/details-view/summary';
import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';

import { DataType } from '@/constants/explore-section/list-views';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';

export default function BoutonDensityDetails() {
  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <Summary<IExperimentalBoutonDensity> dataType={DataType.ExperimentalBoutonDensity} />
    </Suspense>
  );
}
