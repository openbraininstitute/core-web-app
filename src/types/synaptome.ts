import { ModelResource } from './explore-section/delta-model';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

const NEXUS_SYNAPTOME_TYPE = 'SingleNeuronSynaptome';

export type SynapsesConfiguration = {
  synapses: Array<TSingleNeuronSynaptomeConfiguration>;
};

type ExclusionRule = {
  id: string;
  distance_soma_gte: number | undefined;
  distance_soma_lte: number | undefined;
};

type SingleSynaptomeConfig = {
  id: string;
  name: string;
  target: string | undefined;
  type: 110 | 10 | undefined;
  distribution: string | undefined;
  formula: string | undefined;
  soma_synapse_count: number | undefined;
  seed: number | undefined;
  exclusion_rules: Array<ExclusionRule> | null;
  color: string;
};

export type SynaptomeModelConfiguration = {
  name: string;
  description: string;
  seed: number;
  modelUrl: string;
  synapses: Array<TSingleNeuronSynaptomeConfiguration>;
};

export type SingleNeuronSynaptomeResource = ModelResource & {
  used: {
    '@id': string;
    '@type': ['Entity', 'MEModel'];
  };
  // objectOfStudy: SynaptomeObjectOfStudy;
  '@type': 'SingleNeuronSynaptome';
};
