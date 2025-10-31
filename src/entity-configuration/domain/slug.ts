const ExperimentalEntitySlug = {
  CellMorphology: 'morphology',
  ExperimentalNeuronDensity: 'neuron-density',
  ElectricalCellRecording: 'electrophysiology',
  IonChannelRecording: 'ion-channel-electrophysiology',
  ExperimentalBoutonDensity: 'bouton-density',
  ExperimentalSynapsesPerConnection: 'synapse-per-connection',
} as const;

export const ModelEntitySlug = {
  EModel: 'e-model',
  MeModel: 'me-model',
  SingleNeuronSynaptome: 'synaptome',
  SingleNeuronSimulation: 'single-neuron-simulation',
  SmallMicrocircuit: 'small-microcircuit',
  Microcircuit: 'microcircuit',
  PairedNeuronsCircuit: 'paired-neurons',
  Circuit: 'circuit',
  IonChannelModel: 'ion-channel-model',
  MEModelWithSynapses: 'me-model-with-synapses',
} as const;

const SimulationEntitySlug = {
  SingleNeuronSimulation: 'single-neuron-simulation',
  SingleNeuronSynaptomeSimulation: 'synaptome-simulation',
  SimulationCampaign: 'simulation-campaign',
  MEModelCircuitSimulation: 'me-model-circuit-simulation',
  PairedNeuronCircuitSimulation: 'paired-neurons-simulation',
  SmallMicrocircuitSimulation: 'small-microcircuit-simulation',
} as const;

export const EntitySlug = {
  ...ExperimentalEntitySlug,
  ...ModelEntitySlug,
  ...SimulationEntitySlug,
  Notebook: 'notebook',
} as const;

export type EntitySlugValue = (typeof EntitySlug)[keyof typeof EntitySlug];
export type ModelEntitySlugValue = (typeof ModelEntitySlug)[keyof typeof ModelEntitySlug];
export type SimulationEntitySlugValue =
  (typeof SimulationEntitySlug)[keyof typeof SimulationEntitySlug];
export type ExperimentalEntitySlugValue =
  (typeof ExperimentalEntitySlug)[keyof typeof ExperimentalEntitySlug];
