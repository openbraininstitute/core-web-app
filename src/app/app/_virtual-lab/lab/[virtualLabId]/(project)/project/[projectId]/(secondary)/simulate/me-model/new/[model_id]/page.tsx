'use client';

import { useEffect } from 'react';
import { useResetAtom } from 'jotai/utils';

import Container from '@/features/entities/neuron-simulation/experiment/containers';
import { resetSimulationAtom } from '@/state/simulate/single-neuron-setter';

export default function SingleNeuronSimulation() {
  const resetSimulation = useResetAtom(resetSimulationAtom);

  useEffect(() => {
    return resetSimulation;
  }, [resetSimulation]);

  return <Container type="single-neuron-simulation" />;
}
