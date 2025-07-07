// TODO: this data type should be moved from this file
import { DataType } from '@/constants/explore-section/list-views';

export const EXPERIMENTAL_DATATYPES = [
  DataType.ExperimentalBoutonDensity,
  DataType.ExperimentalNeuronDensity,
  DataType.ExperimentalElectroPhysiology,
  DataType.ExperimentalSynapsePerConnection,
  DataType.ExperimentalNeuronMorphology,
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
