'use client';

import { useSearchParams } from 'next/navigation';
import { ErrorBoundary } from '@sentry/nextjs';

import MorphologyOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/morphology-overview-card';
import EModelOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/emodel-overview-card';
import CardError from '@/features/entities/me-model/detail-view/card-viewers/card-error';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';

export default function Configuration({ model: { morphology, emodel } }: { model: IMEModel }) {
  const params = useSearchParams();
  const emodelId = params?.get('e');
  const morphologyId = params?.get('m');

  return (
    <div className="flex w-full flex-col gap-4">
      <ErrorBoundary fallback={<CardError />}>
        <MorphologyOverviewCard
          key="morphology-overview-card"
          mode={morphologyId ? 'select' : 'summary'}
          data={morphology}
        />
      </ErrorBoundary>
      <ErrorBoundary fallback={<CardError />}>
        <EModelOverviewCard
          key="e-model-overview-card"
          mode={emodelId ? 'select' : 'summary'}
          data={emodel}
        />
      </ErrorBoundary>
    </div>
  );
}
