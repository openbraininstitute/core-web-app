'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { StandardFallback } from '@/components/build-section/cell-model-assignment/e-model/EModelView/ErrorMessageLine';
import SimulationParameters from '@/components/build-section/cell-model-assignment/e-model/EModelView/SimulationParameters';
import ExemplarMorphology from '@/components/build-section/cell-model-assignment/e-model/EModelView/exemplar-morphology';
import WorkflowAttributes from '@/components/build-section/cell-model-assignment/e-model/EModelView/WorkflowAttributes';
import Mechanism from '@/components/build-section/cell-model-assignment/e-model/EModelView/ion-channels';
import EModelTitle from '@/components/build-section/cell-model-assignment/e-model/EModelView/EModelTitle';
import SimpleErrorComponent, { withErrorConfig } from '@/components/GenericErrorFallback';
import ExemplarTraces from '@/features/entities/e-model/detail-view/exemplar-traces';
import DefaultLoadingSuspense from '@/components/DefaultLoadingSuspense';

import type { IReconstructionMorphology, IEModel } from '@/api/entitycore/types';

type Params = {
  id: string;
  projectId: string;
  virtualLabId: string;
};

export default function EModelView({
  params,
  payload,
  showTitle = true,
}: {
  params: Params;
  payload: {
    source: IEModel;
    exemplar_morphology: IReconstructionMorphology;
  };
  showTitle?: boolean;
}) {
  return (
    <div className="flex flex-col gap-12">
      {showTitle && (
        <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
          <DefaultLoadingSuspense>
            <EModelTitle />
          </DefaultLoadingSuspense>
        </ErrorBoundary>
      )}

      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <DefaultLoadingSuspense>
          <SimulationParameters />
        </DefaultLoadingSuspense>
      </ErrorBoundary>

      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <DefaultLoadingSuspense>
          <ErrorBoundary
            fallback={<StandardFallback type="error">Exemplar morphology</StandardFallback>}
          >
            <ExemplarMorphology params={params} exemplarMorphology={payload.exemplar_morphology} />
          </ErrorBoundary>
        </DefaultLoadingSuspense>
      </ErrorBoundary>

      <DefaultLoadingSuspense>
        <ErrorBoundary fallback={<StandardFallback type="info">Exemplar traces</StandardFallback>}>
          <ExemplarTraces params={params} />
        </ErrorBoundary>
      </DefaultLoadingSuspense>
      <ErrorBoundary fallback={<StandardFallback type="info">Mechanisms</StandardFallback>}>
        <Mechanism source={payload.source} params={params} />
      </ErrorBoundary>

      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          cls: { container: 'bg-white' },
          showButtons: false,
          customError: 'Error while loading workflow attributes',
        })}
      >
        <WorkflowAttributes />
      </ErrorBoundary>
    </div>
  );
}
