// TODO: this data type should be moved from this file
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const EXPERIMENTAL_DATATYPES = [
  ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
  ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
  ExtendedEntitiesTypeDict.ElectricalCellRecording,
  ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
  ExtendedEntitiesTypeDict.CellMorphology,
] as const;

export enum ExperimentTypeNames {
  MORPHOLOGY = 'morphology',
  ELECTROPHYSIOLOGY = 'electrophysiology',
  NEURON_DENSITY = 'neuron-density',
  BOUTON_DENSITY = 'bouton-density',
  SYNAPSE_PER_CONNECTION = 'synapse-per-connection',
}

export type TExperimentTypeNames = `${ExperimentTypeNames}`;
export type ExperimentalDataType = (typeof EXPERIMENTAL_DATATYPES)[number];
