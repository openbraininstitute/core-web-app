'use client';

import { useSearchParams } from 'next/navigation';
import { match } from 'ts-pattern';

import { ExperimentStep } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';
import { ExperimentSetup } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/experiment-setup';
import { Info } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/overview';
import { Recording } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/recording-locations';
import { StimulationProtocol } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/stimulation-protocol';
import { SimulationType } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { SynapticsConfiguration } from '@/ui/segments/workflows/simulate/single-neuron/single-neuron-synaptome/synaptics';

import type { IMEModel, ISingleNeuronSynaptome } from '@/api/entitycore/types';

type Props = {
  sessionId: string;
  synaptome: ISingleNeuronSynaptome;
  memodel: IMEModel;
};

export function Content({ sessionId, memodel, synaptome }: Props) {
  const searchParams = useSearchParams();
  const step = searchParams.get('step') ?? ExperimentStep.Info;

  const content = match({ step })
    .with({ step: ExperimentStep.Info }, () => (
      <Info sessionId={sessionId} simulationType={SimulationType.SingleNeuronSynaptome} />
    ))
    .with({ step: ExperimentStep.ExperimentalSetup }, () => (
      <ExperimentSetup sessionId={sessionId} />
    ))
    .with({ step: ExperimentStep.SynapticInputs }, () => (
      <SynapticsConfiguration sessionId={sessionId} memodelId={memodel.id} synaptome={synaptome} />
    ))
    .with({ step: ExperimentStep.StimulationProtocol }, () => (
      <StimulationProtocol sessionId={sessionId} memodelId={memodel.id} />
    ))
    .with({ step: ExperimentStep.Recording }, () => <Recording sessionId={sessionId} />)
    .otherwise(() => null);

  return content;
}
