const ExperimentalEntitySlug = {
  CellMorphology: 'morphology',
  ExperimentalNeuronDensity: 'neuron-density',
  ElectricalCellRecording: 'electrophysiology',
  IonChannelRecording: 'ion-channel-electrophysiology',
  ExperimentalBoutonDensity: 'bouton-density',
  ExperimentalSynapsesPerConnection: 'synapse-per-connection',
  EMCellMesh: 'em-cell-mesh',
} as const;

export const ModelEntitySlug = {
  EModel: 'e-model',
  MeModel: 'me-model',
  SingleNeuronSynaptome: 'synaptome',
  SingleNeuronSimulation: 'single-neuron-simulation',
  SingleNeuronCircuit: 'single-neuron-circuit',
  PairedNeuronsCircuit: 'paired-neurons',
  SmallMicrocircuit: 'small-microcircuit',
  Microcircuit: 'microcircuit',
  BrainRegion: 'brain-region',
  Circuit: 'circuit',
  IonChannelModel: 'ion-channel-model',
  IonChannelModelingCampaign: 'ion-channel-modeling-campaign',
  MEModelWithSynapses: 'me-model-with-synapses',
  EmSynapseMappingCampaign: 'em-synapse-mapping-campaign',
} as const;

const SimulationEntitySlug = {
  SingleNeuronSimulation: 'single-neuron-simulation',
  SingleNeuronSynaptomeSimulation: 'synaptome-simulation',
  SimulationCampaign: 'simulation-campaign',
  MEModelCircuitSimulation: 'me-model-circuit-simulation',
  SingleNeuronCircuitSimulation: 'single-neuron-circuit-simulation',
  PairedNeuronCircuitSimulation: 'paired-neurons-simulation',
  SmallMicrocircuitSimulation: 'small-microcircuit-simulation',
  MicrocircuitSimulation: 'microcircuit-simulation',
  IonChannelModelSimulation: 'ion-channel-model-simulation',
  RegionCircuitSimulation: 'region-circuit-simulation',
} as const;

const ExtractionEntitySlug = {
  CircuitExtraction: 'circuit-extraction',
} as const;

const ProcessingEntitySlug = {
  Skeletonization: 'skeletonization',
} as const;

export const EntitySlug = {
  ...ExperimentalEntitySlug,
  ...ModelEntitySlug,
  ...SimulationEntitySlug,
  ...ExtractionEntitySlug,
  ...ProcessingEntitySlug,
  Notebook: 'notebook',
} as const;

export type EntitySlugValue = (typeof EntitySlug)[keyof typeof EntitySlug];
export type ModelEntitySlugValue = (typeof ModelEntitySlug)[keyof typeof ModelEntitySlug];
export type SimulationEntitySlugValue =
  (typeof SimulationEntitySlug)[keyof typeof SimulationEntitySlug];
export type ExperimentalEntitySlugValue =
  (typeof ExperimentalEntitySlug)[keyof typeof ExperimentalEntitySlug];
export type ExtractionEntitySlugValue =
  (typeof ExtractionEntitySlug)[keyof typeof ExtractionEntitySlug];
export type ProcessingEntitySlugValue =
  (typeof ProcessingEntitySlug)[keyof typeof ProcessingEntitySlug];
