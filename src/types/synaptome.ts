import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

export type SynapsesConfiguration = {
  synapses: Array<TSingleNeuronSynaptomeConfiguration>;
};

export type SynaptomeModelConfiguration = {
  name: string;
  description: string;
  seed: number;
  modelUrl: string;
  synapses: Array<TSingleNeuronSynaptomeConfiguration>;
};
