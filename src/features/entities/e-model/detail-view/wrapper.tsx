'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { DefaultLoadingSuspense } from '@/components/DefaultLoadingSuspense';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { StandardFallback } from '@/features/entities/e-model/detail-view/error-message-line';
import { ExemplarMorphology } from '@/features/entities/e-model/detail-view/exemplar-morphology';
import { ExemplarTraces } from '@/features/entities/e-model/detail-view/exemplar-traces';
import IonChannels from '@/features/entities/e-model/detail-view/ion-channels';

import type { ICellMorphology, IEModel } from '@/api/entitycore/types';

export default function EModelView({
  payload,
}: {
  payload: {
    source: IEModel;
    exemplar_morphology: ICellMorphology;
  };
}) {
  return (
    <div className="flex flex-col gap-5">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <DefaultLoadingSuspense>
          <ErrorBoundary
            fallback={<StandardFallback type="error">Exemplar morphology</StandardFallback>}
          >
            <ExemplarMorphology exemplarMorphology={payload.exemplar_morphology} />
          </ErrorBoundary>
        </DefaultLoadingSuspense>
      </ErrorBoundary>

      <ExemplarTraces source={payload.source} />

      <ErrorBoundary fallback={<StandardFallback type="info">Mechanisms</StandardFallback>}>
        <IonChannels source={payload.source} />
      </ErrorBoundary>
    </div>
  );
}
