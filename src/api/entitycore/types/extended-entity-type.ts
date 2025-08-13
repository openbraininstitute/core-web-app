// NOTE: this types has changed be named to "ExtendedEntitiesType"
// NOTE: rename the old ones to entity core naming and update
// TODO: update virtual-lab-api with the new names
// NOTE: There are now various nested types associated with a single parent type in EntityCore.
// We should enable selection and data manipulation for both the nested types and those directly defined in EntityCore.
export enum ExtendedEntitiesType {
  ExperimentalBoutonDensity = `experimental_bouton_density`,
  ExperimentalNeuronDensity = `experimental_neuron_density`,
  ElectricalCellRecording = `electrical_cell_recording`,
  ExperimentalSynapsePerConnection = `experimental_synapses_per_connection`,
  ReconstructionMorphology = `reconstruction_morphology`,
  SimulationCampaign = `simulation_campaign`,
  EModel = 'emodel',
  MEModel = 'memodel',
  SingleNeuronSimulation = 'single_neuron_simulation',
  SingleNeuronSynaptome = 'single_neuron_synaptome',
  SingleNeuronSynaptomeSimulation = 'single_neuron_synaptome_simulation',
  Circuit = 'circuit',
  SmallMicrocircuit = 'small_micro_circuit',
  Microcircuit = 'micro_circuit',
  PairedNeuronCircuit = 'paired_neuron_circuit',
  PairedNeuronCircuitSimulation = 'paired_neuron_circuit_simulation',
  SmallMicrocircuitSimulation = 'small_microcircuit_simulation',
}

export type TExtendedEntitiesType = `${ExtendedEntitiesType}`;

export const DEFAULT_CHECKLIST_RENDER_LENGTH = 8;
export const PAGE_SIZE = 30;
export const PAGE_NUMBER = 1;
