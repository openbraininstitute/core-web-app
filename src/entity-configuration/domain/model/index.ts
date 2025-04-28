// TODO: this data type should be moved from this file
import { DataType } from '@/constants/explore-section/list-views';

export * from './single-neuron-synaptome';
export * from './me-model';
export * from './e-model';
export * from './mesh';

export const MODEL_DATATYPES = [
  DataType.CircuitEModel,
  DataType.CircuitMEModel,
  DataType.SingleNeuronSynaptome,
];

export enum ModelTypeNames {
  E_MODEL = 'e-model',
  ME_MODEL = 'me-model',
  SINGLE_NEURON_SYNAPTOME = 'synaptome',
  CIRCUIT = 'circuit',
}
