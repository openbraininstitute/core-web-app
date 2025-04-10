'use client';

import { useResetAtom } from 'jotai/utils';
import { useEffect, use } from 'react';
import { resetSimulationAtom } from '@/state/simulate/single-neuron-setter';
import SingleNeuronSimulationGenericContainer from '@/components/simulate/single-neuron/containers';

type Props = {
  params: Promise<{
    projectId: string;
    virtualLabId: string;
  }>;
};

export default function SynaptomeSimulation(props: Props) {
  const params = use(props.params);

  const { projectId, virtualLabId } = params;

  const resetSimulation = useResetAtom(resetSimulationAtom);

  useEffect(() => {
    return resetSimulation;
  }, [resetSimulation]);

  return (
    <SingleNeuronSimulationGenericContainer
      {...{
        virtualLabId,
        projectId,
        type: 'synaptome-simulation',
      }}
    />
  );
}
