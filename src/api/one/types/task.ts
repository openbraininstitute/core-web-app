export const ObiOneTaskTypeDict = {
  CircuitExtraction: 'circuit_extraction',
  CircuitSimulation: 'circuit_simulation',
  Skeletonization: 'morphology_skeletonization',
  MorphologySkeletonization: 'morphology_skeletonization',
  IonChannelModelSimulationExecution: 'ion_channel_model_simulation_execution',
  EmSynapseMapping: 'em_synapse_mapping',
} as const;

export type TObiOneTaskType = (typeof ObiOneTaskTypeDict)[keyof typeof ObiOneTaskTypeDict];
