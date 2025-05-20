import { usePathname } from 'next/navigation';
import SimulationButton from '../molecules/SimulationButton';
import { SimulationConfiguration } from '../processSteps';

import { SimulationType } from '@/types/simulation/common';

type Props = {
  projectId: string;
  virtualLabId: string;
};

const SIMULATION_TYPE: SimulationType = 'single-neuron-simulation';

function SingleNeuron({ projectId, virtualLabId }: Props) {
  const modelId = usePathname().split('/').pop() as string;

  return (
    <>
      <SimulationConfiguration
        modelId={modelId}
        type={SIMULATION_TYPE}
        projectId={projectId}
        virtualLabId={virtualLabId}
      />
      <div className="fixed right-4 bottom-4 z-20 mt-auto">
        <SimulationButton
          modelId={modelId}
          vLabId={virtualLabId}
          projectId={projectId}
          simulationType={SIMULATION_TYPE}
        />
      </div>
    </>
  );
}

export default SingleNeuron;
