'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { ExemplarMorphology } from '@/features/entities/e-model/detail-view/exemplar-morphology';
import { StandardFallback } from '@/features/entities/e-model/detail-view/error-message-line';
import { ExemplarTraces } from '@/features/entities/e-model/detail-view/exemplar-traces';
import { DefaultLoadingSuspense } from '@/components/DefaultLoadingSuspense';
import IonChannels from '@/features/entities/e-model/detail-view/ion-channels';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import type { DetailViewVariant } from '@/ui/segments/detail-view/variant-styles';

import type { ICellMorphology, IEModel } from '@/api/entitycore/types';

export default function EModelView({
  payload,
  variant = 'light',
}: {
  payload: {
    source: IEModel;
    exemplar_morphology: ICellMorphology;
  };
  variant?: DetailViewVariant;
}) {
  return (
    <div className="flex flex-col gap-5">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <DefaultLoadingSuspense>
          <ErrorBoundary
            fallback={
              <StandardFallback type="error" variant={variant}>
                Exemplar morphology
              </StandardFallback>
            }
          >
            <ExemplarMorphology exemplarMorphology={payload.exemplar_morphology} variant={variant} />
          </ErrorBoundary>
        </DefaultLoadingSuspense>
      </ErrorBoundary>

      <ExemplarTraces source={payload.source} variant={variant} />

      <ErrorBoundary
        fallback={
          <StandardFallback type="info" variant={variant}>
            Mechanisms
          </StandardFallback>
        }
      >
        <IonChannels source={payload.source} variant={variant} />
      </ErrorBoundary>
    </div>
  );
}
