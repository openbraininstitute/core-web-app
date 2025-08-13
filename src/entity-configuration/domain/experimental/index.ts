// TODO: this data type should be moved from this file
import { ExtendedEntitiesType } from '@/api/entitycore/types/extended-entity-type';

export const EXPERIMENTAL_DATATYPES = [
  ExtendedEntitiesType.ExperimentalBoutonDensity,
  ExtendedEntitiesType.ExperimentalNeuronDensity,
  ExtendedEntitiesType.ElectricalCellRecording,
  ExtendedEntitiesType.ExperimentalSynapsePerConnection,
  ExtendedEntitiesType.ReconstructionMorphology,
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
