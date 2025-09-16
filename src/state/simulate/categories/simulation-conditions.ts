import { useAtom } from 'jotai';

import { atomWithReset } from 'jotai/utils';
import { SimulationExperimentalSetup } from '@/types/small-scale-simulator/single-neuron';
import { DEFAULT_SIMULATION_EXPERIMENTAL_SETUP } from '@/constants/simulate/single-neuron';

export const simulationExperimentalSetupAtom = atomWithReset<SimulationExperimentalSetup>(
  DEFAULT_SIMULATION_EXPERIMENTAL_SETUP
);

simulationExperimentalSetupAtom.debugLabel = 'simulationExperimentalSetupAtom';

export default function useSimulationConditions() {
  const [state, update] = useAtom(simulationExperimentalSetupAtom);

  function setProperty({
    key,
    newValue,
  }: {
    key: keyof SimulationExperimentalSetup;
    newValue: number | null;
  }) {
    return update({
      ...state,
      [key]: newValue,
    });
  }

  return {
    state,
    setProperty,
  };
}
