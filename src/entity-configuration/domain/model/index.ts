// TODO: this data type should be moved from this file
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export * from '@/entity-configuration/domain/model/circuit';

export const MODEL_DATATYPES = [
  ExtendedEntitiesTypeDict.Emodel,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
] as const;

export enum ModelTypeNames {
  E_MODEL = 'e-model',
  ME_MODEL = 'me-model',
  SINGLE_NEURON_SYNAPTOME = 'synaptome',
  CIRCUIT = 'circuit',
}

export type ModelDataType = (typeof MODEL_DATATYPES)[number];
