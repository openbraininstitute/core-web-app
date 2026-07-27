export const ObiOneTaskTypeDict = {
  CircuitExtraction: 'circuit_extraction',
  EFeatureExtraction: 'efeature_extraction',
  CircuitSimulation: 'circuit_simulation',
  CircuitSimulationBrian2: 'circuit_simulation_brian2_machine',
  Skeletonization: 'morphology_skeletonization',
  MorphologySkeletonization: 'morphology_skeletonization',
  IonChannelModelSimulationExecution: 'ion_channel_model_simulation_execution',
  EmSynapseMapping: 'em_synapse_mapping',
  ExtracellularRecordingWeightsCalculation: 'extracellular_recording_weights_calculation',
  // placeholder: obi-one has no launchable build-synaptome task yet (the `build-synaptome`
  // branch ships the ScanConfig/form only), so nothing submits this type today.
  BuildSynaptome: 'build_synaptome',
} as const;

export type TObiOneTaskType = (typeof ObiOneTaskTypeDict)[keyof typeof ObiOneTaskTypeDict];
