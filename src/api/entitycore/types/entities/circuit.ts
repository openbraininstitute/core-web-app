import type {
  EntityAuthorization,
  Timestamps,
  EntityCoreOwnership,
  EntityCoreType,
  EntityCoreBaseAsset,
  EntityCoreIdentifiableNamed,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  SharedFilter,
  PaginationFilter,
  IdFilter,
  IlikeSearchFilter,
} from '@/api/entitycore/types/shared/request';

export const CircuitBuildCategory = {
  ComputationalModel: {
    key: 'computational_model',
    label: 'Computational model',
  },
  EmReconstruction: {
    key: 'em_reconstruction',
    label: 'EM reconstruction',
  },
} as const;

export const CircuitScale = {
  Single: {
    key: 'single',
    label: 'Single',
  },
  PairNeuron: {
    key: 'pair',
    label: 'Pair neuron',
  },
  SmallMicrocircuit: {
    key: 'small',
    label: 'Small Microcircuit',
  },
  Microcircuit: {
    key: 'microcircuit',
    label: 'Microcircuit',
  },
  Region: {
    key: 'region',
    label: 'Region',
  },
  System: {
    key: 'system',
    label: 'System',
  },
  WholeBrain: {
    key: 'whole_brain',
    label: 'Whole brain',
  },
} as const;

export const CircuitScaleDictionary = Object.fromEntries(
  Object.entries(CircuitScale).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof CircuitScale]: (typeof CircuitScale)[K]['key'];
};
export const CircuitBuildCategoryDictionary = Object.fromEntries(
  Object.entries(CircuitBuildCategory).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof CircuitBuildCategory]: (typeof CircuitBuildCategory)[K]['key'];
};

export type TCircuitScaleDictionary =
  (typeof CircuitScaleDictionary)[keyof typeof CircuitScaleDictionary];

export type TCircuitBuildCategoryDictionary =
  (typeof CircuitBuildCategory)[keyof typeof CircuitBuildCategory]['key'];

interface CircuitBase {
  description: string;
  number_neurons: number;
  number_synapses: number;
  number_connections: number;
  build_category: TCircuitBuildCategoryDictionary;
  scale: TCircuitScaleDictionary;
  root_circuit_id: string;
  experiment_date: string | null;
  contact_email: string | null;
  published_in: string | null;
}

export interface ICircuit
  extends EntityCoreIdentifiableNamed,
    EntityAuthorization,
    CircuitBase,
    Timestamps,
    EntityCoreOwnership,
    EntityCoreType,
    EntityCoreBaseAsset {}

type CircuitScaleFilter = {
  scale: string | null;
  scale__in: Array<string>;
};
export interface ICircuitFilter
  extends IdFilter,
    BrainRegionFilter,
    SharedFilter,
    PaginationFilter,
    CircuitScaleFilter,
    IlikeSearchFilter {}

export type SonataCircuitNetworkEdgeConfigItem = {
  edges_file: string;
  populations: Record<
    string,
    {
      type: string;
    }
  >;
};

export type SonataCircuitNetworkNodeConfigItem = {
  nodes_file: string;
  populations: Record<
    string,
    {
      type: 'biophysical' | 'virtual';
      biophysical_neuron_models_dir?: string;
      morphologies_dir?: string;
      alternate_morphologies?: Record<string, string>;
    }
  >;
};

export type SonataCircuitConfigNetworks = {
  edges: Array<SonataCircuitNetworkEdgeConfigItem>;
  nodes: Array<SonataCircuitNetworkNodeConfigItem>;
};

export type SonataCircuitComponentConfig = {
  biophysical_neuron_models_dir: string;
  mechanisms_dir: string;
  morphologies_dir: string;
  point_neuron_models_dir: string;
  provenance: {
    id_mapping: string;
  };
  synaptic_models_dir: string;
  templates_dir: string;
  alternate_morphologies?: Record<string, string>;
};

export type ICircuitSonataConfiguration = {
  components: SonataCircuitComponentConfig;
  networks: SonataCircuitConfigNetworks;
  node_sets_file: string;
  version: number;
  manifest: {
    [key: string]: string;
  };
};

export type CircuitConnectivityMatricesConfiguration = Record<
  string,
  Record<string, { description: string; path: string }>
>;
