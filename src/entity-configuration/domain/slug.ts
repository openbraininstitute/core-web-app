export const ExperimentalEntitySlug = {
  ReconstructionMorphology: 'morphology',
  ExperimentalNeuronDensity: 'neuron-density',
  ElectricalCellRecording: 'electrophysiology',
  ExperimentalBoutonDensity: 'bouton-density',
  ExperimentalSynapsesPerConnection: 'synapse-per-connection',
} as const;

export const ModelEntitySlug = {
  EModel: 'e-model',
  MeModel: 'me-model',
  SingleNeuronSynaptome: 'synaptome',
  SingleNeuronSimulation: 'single-neuron-simulation',
  Circuit: 'tiny-circuit',
} as const;

export const SimulationEntitySlug = {
  SingleNeuronSimulation: 'single-neuron-simulation',
  SingleNeuronSynaptomeSimulation: 'synaptome-simulation',
} as const;

export const EntitySlug = {
  ...ExperimentalEntitySlug,
  ...ModelEntitySlug,
  ...SimulationEntitySlug,
} as const;

export type EntitySlugUnion = keyof typeof EntitySlug;
export type EntitySlugValue = (typeof EntitySlug)[keyof typeof EntitySlug];
export type ModelEntitySlugValue = (typeof ModelEntitySlug)[keyof typeof ModelEntitySlug];
export type SimulationEntitySlugValue =
  (typeof SimulationEntitySlug)[keyof typeof SimulationEntitySlug];
export type ExperimentalEntitySlugValue =
  (typeof ExperimentalEntitySlug)[keyof typeof ExperimentalEntitySlug];
