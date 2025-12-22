'use client';

import { useSearchParams } from 'next/navigation';
import { match } from 'ts-pattern';

import { StimulationProtocol } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/stimulation-protocol';
import { ExperimentSetup } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/experiment-setup';
import { Recording } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/recording-locations';
import { ExperimentStep } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { Info } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/overview';

import type { IMEModel } from '@/api/entitycore/types';

type Props = {
  sessionId: string;
  memodel: IMEModel;
};

export function Content({ sessionId, memodel }: Props) {
  const searchParams = useSearchParams();
  const step = searchParams.get('step') ?? ExperimentStep.Info;

  const content = match({ step })
    .with({ step: ExperimentStep.Info }, () => (
      <Info sessionId={sessionId} simulationType={SimulationType.SingleNeuron} />
    ))
    .with({ step: ExperimentStep.ExperimentalSetup }, () => (
      <ExperimentSetup sessionId={sessionId} />
    ))
    .with({ step: ExperimentStep.StimulationProtocol }, () => (
      <StimulationProtocol sessionId={sessionId} memodelId={memodel.id} />
    ))
    .with({ step: ExperimentStep.Recording }, () => <Recording sessionId={sessionId} />)
    .otherwise(() => null);

  return content;
}
