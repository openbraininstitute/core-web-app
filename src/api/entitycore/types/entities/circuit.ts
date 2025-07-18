import type {
  EntityAuthorization,
  Timestamps,
  EntityCoreOwnership,
  EntityCoreType,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  SharedFilter,
  PaginationFilter,
  IdFilter,
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
  Microcircuit: {
    key: 'microcircuit',
    label: 'Microcircuit',
  },
  SmallMicrocircuit: {
    key: 'small',
    label: 'Small Microcircuit',
  },
  PairNeuron: {
    key: 'pair',
    label: 'Pair neuron',
  },
  Region: {
    key: 'region',
    label: 'Region',
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
  name: string;
  description: string;
  number_neurons: number;
  number_synapses: number;
  number_connections: number;
  build_category: TCircuitBuildCategoryDictionary;
  scale: TCircuitScaleDictionary;
  root_circuit_id: string;
}

export interface ICircuit
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    CircuitBase,
    Timestamps,
    EntityCoreOwnership,
    EntityCoreType,
    EntityCoreBaseAsset {
  sub_circuits?: Array<ICircuit>;
}

type CircuitScaleFilter = {
  scale: string | null;
  scale__in: Array<string>;
};
export interface ICircuitFilter
  extends IdFilter,
    BrainRegionFilter,
    SharedFilter,
    PaginationFilter,
    CircuitScaleFilter {}
