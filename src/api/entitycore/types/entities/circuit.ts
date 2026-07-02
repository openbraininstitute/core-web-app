import type {
  EntityDerivationFilter,
  EntityDerivations,
} from '@/api/entitycore/types/entities/derivation';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiableNamed,
  EntityCoreOwnership,
  EntityCoreType,
  ISubject,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  BrainRegionHierarchyFilter,
  IdFilter,
  IlikeSearchFilter,
  PaginationFilter,
  SharedFilter,
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

export const CircuitTargetSimulator = {
  Neuron: { key: 'NEURON', label: 'NEURON' },
  Brian2: { key: 'Brian2', label: 'Brian2' },
  LearningEngine: { key: 'LearningEngine', label: 'LearningEngine' },
} as const;

export type TCircuitTargetSimulator =
  (typeof CircuitTargetSimulator)[keyof typeof CircuitTargetSimulator]['key'];

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
  has_electrical_cell_models: boolean;
  target_simulator: TCircuitTargetSimulator | null;
}

export interface ICircuit
  extends EntityCoreIdentifiableNamed,
    EntityAuthorization,
    CircuitBase,
    Timestamps,
    EntityCoreOwnership,
    EntityCoreType,
    EntityCoreBaseAsset,
    EntityDerivations {
  subject?: ISubject;
}

type CircuitScaleFilter = {
  scale: string | null;
  scale__in: Array<string>;
};
export interface ICircuitFilter
  extends IdFilter,
    BrainRegionFilter,
    BrainRegionHierarchyFilter,
    SharedFilter,
    PaginationFilter,
    CircuitScaleFilter,
    IlikeSearchFilter,
    // `generated_derivation__derivation_type[__in]` drives the "Derivation type" column filter.
    EntityDerivationFilter {
  has_electrical_cell_models?: boolean;
  target_simulator__in?: Array<string>;
}

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
