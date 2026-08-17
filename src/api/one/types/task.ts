export const ObiOneTaskTypeDict = {
  CircuitExtraction: 'circuit_extraction',
  CircuitSimulation: 'circuit_simulation',
  CircuitSimulationBrian2: 'circuit_simulation_brian2_machine',
  Skeletonization: 'morphology_skeletonization',
  MorphologySkeletonization: 'morphology_skeletonization',
  IonChannelModelSimulationExecution: 'ion_channel_model_simulation_execution',
  SingleNeuronSimulationExecution: 'single_neuron_simulation_execution',
  SingleNeuronSynaptomeSimulationExecution: 'single_neuron_synaptome_simulation_execution',
  EmSynapseMapping: 'em_synapse_mapping',
  ExtracellularRecordingWeightsCalculation: 'extracellular_recording_weights_calculation',
} as const;

export type TObiOneTaskType = (typeof ObiOneTaskTypeDict)[keyof typeof ObiOneTaskTypeDict];
