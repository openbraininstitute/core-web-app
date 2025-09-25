'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { StandardFallback } from '@/components/build-section/cell-model-assignment/e-model/EModelView/ErrorMessageLine';
import ExemplarMorphology from '@/components/build-section/cell-model-assignment/e-model/EModelView/exemplar-morphology';
import IonChannels from '@/components/build-section/cell-model-assignment/e-model/EModelView/ion-channels';
import ExemplarTraces from '@/features/entities/e-model/detail-view/exemplar-traces';
import DefaultLoadingSuspense from '@/components/DefaultLoadingSuspense';
import SimpleErrorComponent from '@/components/GenericErrorFallback';

import type { ICellMorphology, IEModel } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

type Params = WorkspaceContext & {
  id: string;
};

export default function EModelView({
  params,
  payload,
}: {
  params: Params;
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

      <ErrorBoundary fallback={<StandardFallback type="info">Exemplar traces</StandardFallback>}>
        <ExemplarTraces params={params} source={payload.source} />
      </ErrorBoundary>

      <ErrorBoundary fallback={<StandardFallback type="info">Mechanisms</StandardFallback>}>
        <IonChannels source={payload.source} params={params} />
      </ErrorBoundary>
    </div>
  );
}
