import { EntityTypeDict } from '@/api/entitycore/types/entity-type';

export const ExtendedEntitiesTypeDict = {
  ...EntityTypeDict,
  SmallMicrocircuit: 'small_micro_circuit',
  Microcircuit: 'micro_circuit',
  SingleNeuronCircuit: 'single_neuron_circuit',
  PairedNeuronCircuit: 'paired_neuron_circuit',
  MemodelCircuit: 'me_model_circuit',
  MemodelCircuitSimulation: 'me_model_circuit_simulation',
  SingleNeuronCircuitSimulation: 'single_neuron_circuit_simulation',
  PairedNeuronCircuitSimulation: 'paired_neuron_circuit_simulation',
  SmallMicrocircuitSimulation: 'small_microcircuit_simulation',
  MicrocircuitSimulation: 'microcircuit_simulation',
  NGVCircuit: 'ngv_circuit', // this is temporary
  BrainRegion: 'brain_region', // this is temporary
  BrainSystems: 'brain_system', // this is temporary
  WholeBrain: 'whole_brain', // this is temporary
  Metabolism: 'metabolism', // this is temporary
  NGVUnit: 'ngv_unit', // this is temporary
  MEModelWithSynapses: 'me_model_with_synapses',
} as const;

export type TExtendedEntitiesTypeDict =
  (typeof ExtendedEntitiesTypeDict)[keyof typeof ExtendedEntitiesTypeDict];
