import type { IMEModel } from '@/api/entitycore/types';
import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { WorkspaceContext } from '@/types/common';

export type SessionValue =
  | (Partial<WorkspaceContext> & {
      seed: number;
      name?: string | undefined;
      description?: string | undefined;
      memodel?: IMEModel | undefined;
      synapseSets?: Map<string, TSingleNeuronSynaptomeConfiguration>;
      synapseCount?: Map<string, number>;
    })
  | null;

export type Config = {
  type: 110 | 10;
  id: string;
  name: string;
  seed: number;
  exclusion_rules:
    | {
        id: string;
        distance_soma_gte?: number | null | undefined;
        distance_soma_lte?: number | null | undefined;
      }[]
    | null;
  target?: string | undefined;
  color?: string | undefined;
  formula?: string | undefined;
  soma_synapse_count?: number | undefined;
};
