import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

import SimulationButton from '../molecules/SimulationButton';
import { SimulationConfiguration } from '../processSteps';
import { useModel } from '@/hooks/useModel';
import { ModelResource } from '@/types/simulation/single-neuron';
import { SimulationType } from '@/types/simulation/common';

import useResourceInfoFromPath from '@/hooks/useResourceInfoFromPath';
import { usePathname } from 'next/navigation';

type Props = {
  projectId: string;
  virtualLabId: string;
};

const SIMULATION_TYPE: SimulationType = 'single-neuron-simulation';

function SingleNeuron({ projectId, virtualLabId }: Props) {
  const modelId = usePathname().split('/').pop();

  const { resource, loading } = useModel<ModelResource>({
    modelId,
    org: virtualLabId,
    project: projectId,
  });

  if (loading || !resource) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading Configuration ...</h2>
      </div>
    );
  }

  return (
    <>
      <SimulationConfiguration meModelUrl={resource._self} type={SIMULATION_TYPE} />
      <div className="fixed right-4 bottom-4 z-20 mt-auto">
        <SimulationButton
          modelSelfUrl={resource._self}
          vLabId={virtualLabId}
          projectId={projectId}
          simulationType={SIMULATION_TYPE}
        />
      </div>
    </>
  );
}

export default SingleNeuron;
