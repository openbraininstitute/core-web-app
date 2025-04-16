// TODO: this data type should be moved from this file
import { DataType } from '@/constants/explore-section/list-views';

export * from './e-model';
export * from './mesh';

export const MODEL_DATATYPES = [
  DataType.CircuitEModel,
  DataType.CircuitMEModel,
  DataType.SingleNeuronSynaptome,
];
