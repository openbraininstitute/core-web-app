'use client';

import { useAtomValue } from 'jotai';

import Recording from './Recording';
import ExperimentSetup from './ExperimentSetup';
import Results from './Results';
import Stimulation from './stimulation-protocol/Stimulation';
import SynapticInputs from './synaptic-input/SynapticInputs';

import { simulateStepTrackerAtom } from '@/state/simulate/single-neuron';
import { SimulationType } from '@/types/simulation/common';

type Props = {
  modelId: string;
  type: SimulationType;
  projectId: string;
  virtualLabId: string;
};

export default function ParameterView({ modelId, type, projectId, virtualLabId }: Props) {
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
            <SynapticInputs />
          </div>
        )}
        <div
          className={currentSimulationStep.title === 'Stimulation protocol' ? 'w-full' : 'hidden'}
        >
          <Stimulation modelId={modelId} projectId={projectId} virtualLabId={virtualLabId} />
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
