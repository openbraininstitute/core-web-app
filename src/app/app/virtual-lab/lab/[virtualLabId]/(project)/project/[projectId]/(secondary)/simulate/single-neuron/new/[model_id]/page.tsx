'use client';

import { useEffect, use } from 'react';
import { useResetAtom } from 'jotai/utils';

import SingleNeuronSimulationGenericContainer from '@/components/simulate/single-neuron/containers';
import { resetSimulationAtom } from '@/state/simulate/single-neuron-setter';
import { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

export default function SingleNeuronSimulation(
  props: ServerSideComponentProp<WorkspaceContext, {}>
) {
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
        type: 'single-neuron-simulation',
      }}
    />
  );
}
