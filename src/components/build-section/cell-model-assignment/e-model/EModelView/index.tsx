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

      <Mechanism params={params} ionChannels={payload.source.ion_channel_models} />

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
