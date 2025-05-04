'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';

import MorphologyOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/morphology-overview-card';
import EModelOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/emodel-overview-card';
import CardContainerSkeleton from '@/features/entities/me-model/detail-view/card-viewers/card-skeleton';
import CardError from '@/features/entities/me-model/detail-view/card-viewers/card-error';

import { getReconstructionMorphology, getEModel } from '@/api/entitycore/queries';
import { tryCatch } from '@/api/utils';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { WorkspaceContext } from '@/types/common';

export default function Configuration({ model }: { model: IMEModel }) {
  const workspace = useParams<WorkspaceContext>();
  const params = useSearchParams();
  const emodelId = params?.get('e');
  const morphologyId = params?.get('m');

  // TODO: probably the promise here not needed, should be removed ?
  const morphologyPromise = !!morphologyId
    ? tryCatch(getReconstructionMorphology({ id: model.morphology.id, context: workspace }))
    : model.morphology;

  const emodelPromise = !!emodelId
    ? tryCatch(getEModel({ id: model.emodel.id, context: workspace }))
    : model.emodel;

  return (
    <div className="flex w-full flex-col gap-4">
      <ErrorBoundary fallback={<CardError />}>
        <Suspense fallback={<CardContainerSkeleton />}>
          <MorphologyOverviewCard
            key="morphology-overview-card"
            mode={!!morphologyId ? 'select' : 'summary'}
            promise={morphologyPromise}
          />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={<CardError />}>
        <Suspense fallback={<CardContainerSkeleton />}>
          <EModelOverviewCard
            key="e-model-overview-card"
            mode={!!emodelId ? 'select' : 'summary'}
            promise={emodelPromise}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
