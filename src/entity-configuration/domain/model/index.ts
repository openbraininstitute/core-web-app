// TODO: this data type should be moved from this file
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const MODEL_DATATYPES = [
  ExtendedEntitiesTypeDict.Emodel,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.MemodelCircuit,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
] as const;

export enum ModelTypeNames {
  E_MODEL = 'e-model',
  ME_MODEL = 'me-model',
  ME_MODEL_CIRCUIT = 'me-model-circuit',
  SINGLE_NEURON_SYNAPTOME = 'synaptome',
  ME_MODEL_WITH_SYNAPSES_CIRCUIT = 'ME-model with Synapses',
  CIRCUIT = 'circuit',
}

export type ModelDataType = (typeof MODEL_DATATYPES)[number];
