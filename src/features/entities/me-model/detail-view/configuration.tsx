'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';

import MorphologyOverviewCard from '@/features/entities/me-model/card-viewers/morphology-overview-card';
import EModelOverviewCard from '@/features/entities/me-model/card-viewers/emodel-overview-card';
import CardContainerSkeleton from '@/features/entities/me-model/card-viewers/card-skeleton';
import CardError from '@/features/entities/me-model/card-viewers/card-error';

import { getReconstructionMorphology, getEModel } from '@/api/entitycore/queries';
import { tryCatch } from '@/api/utils';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { WorkspaceContext } from '@/types/common';

export default function Configuration({ model }: { model: IMEModel }) {
  const workspaceContext = useParams<WorkspaceContext>();
  const params = useSearchParams();

  const morphologyPromise = tryCatch(
    getReconstructionMorphology({ id: model.morphology.id, context: workspaceContext })
  );
  const emodelPromise = tryCatch(getEModel({ id: model.emodel.id, context: workspaceContext }));
  const emodelId = params?.get('e');
  const morphologyId = params?.get('m');

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
