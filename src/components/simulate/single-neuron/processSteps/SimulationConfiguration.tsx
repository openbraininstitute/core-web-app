'use client';

import ParameterView from '../steps';
import Wrapper from '@/components/simulate/single-neuron/molecules/Wrapper';
import NeuronViewerContainer from '@/components/neuron-viewer/NeuronViewerWithActions';
import { SimulationType } from '@/types/simulation/common';

type Props = {
  modelId: string;
  type: SimulationType;
};

export default function SimulationConfiguration({ modelId, type }: Props) {
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
        />
      }
      type={type}
    >
      <ParameterView meModelSelf={modelId} type={type} />
    </Wrapper>
  );
}
