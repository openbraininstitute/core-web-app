'use client';

import { useAtomValue } from 'jotai';

import Stimulation from '@/features/entities/neuron-simulation/experiment/steps-wizard/stimulation-protocol/stimulation';
import SynapticInputs from '@/features/entities/neuron-simulation/experiment/steps-wizard/synaptic-input/list';
import ExperimentSetup from '@/features/entities/neuron-simulation/experiment/steps-wizard/experiment-setup';
import Recording from '@/features/entities/neuron-simulation/experiment/steps-wizard/recording';
import Results from '@/features/entities/neuron-simulation/experiment/steps-wizard/results';

import { simulateStepTrackerAtom } from '@/state/simulate/single-neuron';

import type { SingleNeuronSynaptomePayload } from '@/features/entities/neuron-simulation/experiment/containers/synaptome';

type BaseProps = {
  meModelId: string;
  projectId: string;
  virtualLabId: string;
};

type SingleNeuronSynaptomeProps = BaseProps & {
  type: 'synaptome-simulation';
  payload: SingleNeuronSynaptomePayload;
};

type SingleNeuronProps = BaseProps & {
  type: 'single-neuron-simulation';
  payload?: never;
};

type Props = SingleNeuronSynaptomeProps | SingleNeuronProps;

export default function ParameterView({
  meModelId,
  type,
  projectId,
  virtualLabId,
  payload,
}: Props) {
  const { current: currentSimulationStep } = useAtomValue(simulateStepTrackerAtom);

  return (
    <div className="relative h-full w-full px-8 py-6">
      <div className="text-primary-8 my-5 text-3xl font-bold capitalize">
        {currentSimulationStep.title}
      </div>
      <div className="flex h-full w-full flex-col items-center text-center text-2xl">
        <div className={currentSimulationStep.title === 'Experimental setup' ? 'w-full' : 'hidden'}>
          <ExperimentSetup />
        </div>
        {type === 'synaptome-simulation' && (
          <div className={currentSimulationStep.title === 'Synaptic inputs' ? 'w-full' : 'hidden'}>
            <SynapticInputs meModelId={meModelId} configuration={payload.config} />
          </div>
        )}
        <div
          className={currentSimulationStep.title === 'Stimulation protocol' ? 'w-full' : 'hidden'}
        >
          <Stimulation modelId={meModelId} projectId={projectId} virtualLabId={virtualLabId} />
        </div>
        <div className={currentSimulationStep.title === 'Recording' ? 'w-full' : 'hidden'}>
          <Recording />
        </div>
        <div className={currentSimulationStep.title === 'Results' ? 'w-full' : 'hidden'}>
          <Results />
        </div>
      </div>
    </div>
  );
}
