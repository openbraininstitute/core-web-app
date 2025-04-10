'use client';

import { useEffect, use } from 'react';
import { useResetAtom } from 'jotai/utils';

import SingleNeuronSimulationGenericContainer from '@/components/simulate/single-neuron/containers';
import { resetSimulationAtom } from '@/state/simulate/single-neuron-setter';

type Props = {
  params: Promise<{
    projectId: string;
    virtualLabId: string;
  }>;
};

export default function SingleNeuronSimulation(props: Props) {
  const params = use(props.params);

  const {
    projectId,
    virtualLabId
  } = params;

  const resetSimulation = useResetAtom(resetSimulationAtom);

  useEffect(() => {
    return resetSimulation;
  }, [resetSimulation]);

  return (
    <SingleNeuronSimulationGenericContainer
      {...{
        virtualLabId,
        projectId,
        type: 'single-neuron-simulation',
      }}
    />
  );
}
