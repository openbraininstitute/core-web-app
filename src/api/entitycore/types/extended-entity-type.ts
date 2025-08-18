// NOTE: this types has changed be named to "ExtendedEntitiesType"
// NOTE: rename the old ones to entity core naming and update
// TODO: update virtual-lab-api with the new names
// NOTE: There are now various nested types associated with a single parent type in EntityCore.
// We should enable selection and data manipulation for both the nested types and those directly defined in EntityCore.
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

export const ExtendedEntitiesTypeDict = {
  ...EntityTypeDict,
  SmallMicrocircuit: 'small_micro_circuit',
  Microcircuit: 'micro_circuit',
  PairedNeuronCircuit: 'paired_neuron_circuit',
  PairedNeuronCircuitSimulation: 'paired_neuron_circuit_simulation',
  SmallMicrocircuitSimulation: 'small_microcircuit_simulation',
} as const;

export type TExtendedEntitiesTypeDict =
  (typeof ExtendedEntitiesTypeDict)[keyof typeof ExtendedEntitiesTypeDict];
