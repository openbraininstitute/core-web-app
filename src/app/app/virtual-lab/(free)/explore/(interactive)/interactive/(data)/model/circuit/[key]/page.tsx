'use client';

import { Suspense } from 'react';

import CIRCUIT_PLACHOLDER_DATA from '@/components/explore-section/Circuit/content/CIRCUITS_PLACEHOLDER';

import CentralLoadingSpinner from '@/components/CentralLoadingSpinner';
import CircuitDetailViewMain from '@/components/explore-section/Circuit/DetailView';
import { SingleCircuitListView } from '@/components/explore-section/Circuit/type';

type Params = {
  params: {
    key: string;
  };
};

export default function CircuitDetailViewPage({ params }: Params) {
  const content: SingleCircuitListView =
    CIRCUIT_PLACHOLDER_DATA.find((circuit) => circuit.key === params.key) ??
    (() => {
      throw new Error(`Circuit with key "${params.key}" not found`);
    })();

  return (
    <Suspense fallback={<CentralLoadingSpinner />}>
      <CircuitDetailViewMain content={content} />
    </Suspense>
  );
}
