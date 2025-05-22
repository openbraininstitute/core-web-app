// TODO: this data type should be moved from this file
import { DataType } from '@/constants/explore-section/list-views';

export * from '@/entity-configuration/domain/model/single-neuron-synaptome';
export * from '@/entity-configuration/domain/model/me-model';
export * from '@/entity-configuration/domain/model/e-model';
export * from '@/entity-configuration/domain/model/mesh';

export const MODEL_DATATYPES = [
  DataType.CircuitEModel,
  DataType.CircuitMEModel,
  DataType.SingleNeuronSynaptome,
  DataType.SingleNeuronSimulation,
] as const;

export enum ModelTypeNames {
  E_MODEL = 'e-model',
  ME_MODEL = 'me-model',
  SINGLE_NEURON_SYNAPTOME = 'synaptome',
  CIRCUIT = 'circuit',
  SINGLE_NEURON_SIMULATION = 'single-neuron-simulation',
}

export type TModelTypeNames = `${ModelTypeNames}`;

export type ModelDataType = (typeof MODEL_DATATYPES)[number];
