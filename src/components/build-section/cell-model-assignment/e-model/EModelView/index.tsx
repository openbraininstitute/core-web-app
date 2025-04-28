import { ErrorBoundary } from 'react-error-boundary';

import { StandardFallback } from './ErrorMessageLine';
import ExemplarMorphology from './exemplar-morphology';
import Mechanism from './Mechanism';
import SimulationParameters from './SimulationParameters';
import EModelTitle from './EModelTitle';
import WorkflowAttributes from './WorkflowAttributes';
import DefaultLoadingSuspense from '@/components/DefaultLoadingSuspense';
import SimpleErrorComponent, { withErrorConfig } from '@/components/GenericErrorFallback';
import ExemplarTraces from '@/features/entities/e-model/detail-view/exemplar-traces';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import { getReconstructionMorphology } from '@/api/entitycore/queries';
import { tryCatch } from '@/api/utils';

type Params = {
  id: string;
  projectId: string;
  virtualLabId: string;
};

export default function EModelView({
  params,
  data,
  showTitle = true,
}: {
  params: Params;
  data: IEModel;
  showTitle?: boolean;
}) {
  const exemplarMorphologyPromise = tryCatch(
    getReconstructionMorphology({
      id: data.exemplar_morphology.id,
      context: { virtualLabId: params.virtualLabId, projectId: params.projectId },
    })
  );
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
            <ExemplarMorphology params={params} promise={exemplarMorphologyPromise} />
          </ErrorBoundary>
        </DefaultLoadingSuspense>
      </ErrorBoundary>

      <DefaultLoadingSuspense>
        <ErrorBoundary fallback={<StandardFallback type="info">Exemplar traces</StandardFallback>}>
          <ExemplarTraces params={params} />
        </ErrorBoundary>
      </DefaultLoadingSuspense>

      <ErrorBoundary
        FallbackComponent={withErrorConfig({
          cls: { container: 'bg-white' },
          showButtons: false,
          customError: 'Error while loading mechanisms',
        })}
      >
        <DefaultLoadingSuspense>
          <Mechanism params={params} />
        </DefaultLoadingSuspense>
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
