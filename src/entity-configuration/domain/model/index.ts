// TODO: this data type should be moved from this file
import { DataType } from '@/constants/explore-section/list-views';

export * from '@/entity-configuration/domain/model/mesh';
export * from '@/entity-configuration/domain/model/circuit';

export const MODEL_DATATYPES = [
  DataType.CircuitEModel,
  DataType.CircuitMEModel,
  DataType.SingleNeuronSynaptome,
] as const;

export enum ModelTypeNames {
  E_MODEL = 'e-model',
  ME_MODEL = 'me-model',
  SINGLE_NEURON_SYNAPTOME = 'synaptome',
  CIRCUIT = 'circuit',
}

export type TModelTypeNames = `${ModelTypeNames}`;

export type ModelDataType = (typeof MODEL_DATATYPES)[number];
