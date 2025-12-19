import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

export type SynapsesConfiguration = {
  synapses: TSingleNeuronSynaptomeConfiguration[];
};

export type SynaptomeModelConfiguration = {
  name: string;
  description: string;
  seed: number;
  modelUrl: string;
  synapses: TSingleNeuronSynaptomeConfiguration[];
};
