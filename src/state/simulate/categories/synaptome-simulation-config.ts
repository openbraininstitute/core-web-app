import { atomWithReset } from 'jotai/utils';
import { useAtom } from 'jotai';
import sample from 'es-toolkit/compat/sample';

import { getDefaultSynapseConfig, SIMULATION_COLORS } from '@/constants/simulate/single-neuron';
import { updateArray } from '@/util/updateArray';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type {
  SynapseConfig,
  UpdateSynapseSimulationProperty,
} from '@/types/small-scale-simulator/single-neuron';

export const synaptomeSimulationConfigAtom = atomWithReset<Array<SynapseConfig>>([]);
synaptomeSimulationConfigAtom.debugLabel = 'synaptomeSimulationConfigAtom';

export default function useSynaptomeSimulationConfig() {
  const [state, update] = useAtom(synaptomeSimulationConfigAtom);

  function findConfig(index: number) {
    const synapseConfig = state.find((_: SynapseConfig, indx) => indx === index);
    if (!synapseConfig) {
      throw new Error(`No Synapse Config for id ${index} exists`);
    }
    return synapseConfig;
  }

  function reset(config: Array<TSingleNeuronSynaptomeConfiguration>) {
    const defaultSynapseConfig = getDefaultSynapseConfig(config);
    if (defaultSynapseConfig) {
      update([
        {
          ...defaultSynapseConfig,
        },
      ]);
    }
  }

  function newConfig(config: Array<TSingleNeuronSynaptomeConfiguration>) {
    const defaultSynapseConfig = getDefaultSynapseConfig(config);
    if (defaultSynapseConfig) {
      update([
        ...(state || []),
        {
          ...defaultSynapseConfig,
          color:
            defaultSynapseConfig.color ??
            sample(SIMULATION_COLORS) ??
            SIMULATION_COLORS[state.length],
        },
      ]);
    }
  }

  function remove(key: number) {
    update(state.filter((s, index) => index !== key) ?? []);
  }

  function empty() {
    update([]);
  }

  function setProperty({ id, key, newValue }: UpdateSynapseSimulationProperty) {
    const config = findConfig(id);
    const updateConfig: SynapseConfig = {
      ...config,
      [key]: newValue,
    };

    return update(
      updateArray({
        array: state,
        keyfn: (item, indx) => indx === id,
        newVal: (item) => Object.assign(item, { ...updateConfig }),
      })
    );
  }

  return {
    state,
    findConfig,
    newConfig,
    remove,
    setProperty,
    reset,
    empty,
  };
}
