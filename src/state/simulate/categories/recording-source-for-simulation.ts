import { useAtom } from 'jotai';

import { atomWithReset } from 'jotai/utils';
import { DEFAULT_RECORDING_LOCATION } from '@/constants/simulate/single-neuron';
import type { NeuronLocation } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

export const recordingSourceForSimulationAtom = atomWithReset<Array<NeuronLocation>>([
  { ...DEFAULT_RECORDING_LOCATION },
]);

recordingSourceForSimulationAtom.debugLabel = 'recordingSourceForSimulationAtom';

export default function useRecordingSourceForSimulation() {
  const [state, update] = useAtom(recordingSourceForSimulationAtom);

  function setSource(index: number, updatedLocation: Partial<NeuronLocation>) {
    update(state.map((r, i) => (i === index ? { ...r, ...updatedLocation } : r)));
  }

  function add(location: NeuronLocation) {
    update([...state, location]);
  }

  function remove(index: number) {
    update(state.filter((_, i) => i !== index));
  }

  return {
    state,
    setSource,
    add,
    remove,
  };
}
