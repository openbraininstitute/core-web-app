import SingleNeuron from "@/components/simulate/single-neuron/containers/SingleNeuron";

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
} as const;

export const EntitySlug = {
  ...ExperimentalEntitySlug,
  ...ModelEntitySlug,
} as const;

export type EntitySlugUnion = keyof typeof EntitySlug;
export type EntitySlugValue = (typeof EntitySlug)[keyof typeof EntitySlug];
export type ModelEntitySlugValue = (typeof ModelEntitySlug)[keyof typeof ModelEntitySlug];
export type ExperimentalEntitySlugValue =
  (typeof ExperimentalEntitySlug)[keyof typeof ExperimentalEntitySlug];
