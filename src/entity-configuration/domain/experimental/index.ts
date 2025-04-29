// TODO: this data type should be moved from this file
import { DataType } from '@/constants/explore-section/list-views';

export * from '@/entity-configuration/domain/experimental/reconstruction-morphology';
export * from '@/entity-configuration/domain/experimental/synapse-per-connection';
export * from '@/entity-configuration/domain/experimental/electrical-cell-recording';
export * from '@/entity-configuration/domain/experimental/bouton-density';
export * from '@/entity-configuration/domain/experimental/neuron-density';

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

export type TExperimentTypeNames = `${ExperimentTypeNames}`;
