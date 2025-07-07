import { DataType } from '@/constants/explore-section/list-views';

export const EXPERIMENTAL_DATATYPES = [
  DataType.ExperimentalBoutonDensity,
  DataType.ExperimentalNeuronDensity,
  DataType.ExperimentalElectroPhysiology,
  DataType.ExperimentalSynapsePerConnection,
  DataType.ExperimentalNeuronMorphology,
];

export enum ExperimentTypeNames {
  MORPHOLOGY = 'morphology',
  ELECTROPHYSIOLOGY = 'electrophysiology',
  NEURON_DENSITY = 'neuron-density',
  BOUTON_DENSITY = 'bouton-density',
  SYNAPSE_PER_CONNECTION = 'synapse-per-connection',
}
