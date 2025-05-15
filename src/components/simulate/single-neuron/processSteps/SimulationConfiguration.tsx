'use client';

import ParameterView from '../steps';
import Wrapper from '@/components/simulate/single-neuron/molecules/Wrapper';
import NeuronViewerContainer from '@/components/neuron-viewer/NeuronViewerWithActions';
import { SimulationType } from '@/types/simulation/common';

type Props = {
  modelId: string;
  type: SimulationType;
  projectId: string;
  virtualLabId: string;
};

export default function SimulationConfiguration({ modelId, type, projectId, virtualLabId }: Props) {
  return (
    <Wrapper
      viewer={
        <NeuronViewerContainer
          useActions
          useCursor
          useEvents
          useZoomer
          useLabels
          modelId={modelId}
          zoomPlacement="right"
          projectId={projectId}
          virtualLabId={virtualLabId}
        />
      }
      type={type}
    >
      <ParameterView
        modelId={modelId}
        type={type}
        projectId={projectId}
        virtualLabId={virtualLabId}
      />
    </Wrapper>
  );
}
