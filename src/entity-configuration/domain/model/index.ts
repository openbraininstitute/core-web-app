// TODO: this data type should be moved from this file
import { DataType } from '@/constants/explore-section/list-views';

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

export type ModelDataType = (typeof MODEL_DATATYPES)[number];
