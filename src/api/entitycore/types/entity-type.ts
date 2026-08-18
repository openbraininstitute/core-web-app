export const EntityTypeDict = {
  AnalysisSoftwareSourceCode: 'analysis_software_source_code',
  Emodel: 'emodel',
  ExperimentalBoutonDensity: 'experimental_bouton_density',
  ExperimentalNeuronDensity: 'experimental_neuron_density',
  ExperimentalSynapsesPerConnection: 'experimental_synapses_per_connection',
  Memodel: 'memodel',
  Mesh: 'mesh',
  CellMorphology: 'cell_morphology',
  ElectricalCellRecording: 'electrical_cell_recording',
  IonChannelRecording: 'ion_channel_recording',
  SingleNeuronSimulation: 'single_neuron_simulation',
  SingleNeuronSynaptome: 'single_neuron_synaptome',
  Subject: 'subject',
  SynapticPathway: 'synaptic_pathway',
  SingleNeuronSynaptomeSimulation: 'single_neuron_synaptome_simulation',
  Circuit: 'circuit',
  CellComposition: 'cell_composition',
  BrainAtlas: 'brain_atlas',
  BrainAtlasRegion: 'brain_atlas_region',
  SimulationCampaign: 'simulation_campaign',
  Simulation: 'simulation',
  IonChannelModel: 'ion_channel_model',
  IonChannelModelingCampaign: 'ion_channel_modeling_campaign',
  IonChannelModelingConfig: 'ion_channel_modeling_config',
  ValidationResult: 'validation_result',
  AnalysisNotebookTemplate: 'analysis_notebook_template',
  AnalysisNotebookResult: 'analysis_notebook_result',
  EMCellMesh: 'em_cell_mesh',
  SkeletonizationCampaign: 'skeletonization_campaign',
  CircuitExtractionCampaign: 'circuit_extraction_campaign',
  CircuitExtractionConfig: 'circuit_extraction_config',
  EFeatureExtractionCampaign: 'efeature_extraction_campaign',
  EFeatureExtractionConfig: 'efeature_extraction_config',
  EFeatureExtractionResult: 'efeature_extraction_result',
  TaskResult: 'task_result',
  EmSynapseMappingCampaign: 'em_synapse_mapping_campaign',
  EmSynapseMappingConfig: 'em_synapse_mapping_config',
  SimulatableExtracellularRecordingArray: 'simulatable_extracellular_recording_array',
  TaskConfig: 'task_config',
} as const;

export const EntityTypeWithBrainRegionDict = {
  ExperimentalSynapsesPerConnection: 'experimental_synapses_per_connection',
  ExperimentalBoutonDensity: 'experimental_bouton_density',
  ExperimentalNeuronDensity: 'experimental_neuron_density',
  CellMorphology: 'cell_morphology',
  ElectricalCellRecording: 'electrical_cell_recording',
  Memodel: 'memodel',
  Emodel: 'emodel',
  Circuit: 'circuit',
  SingleNeuronSynaptome: 'single_neuron_synaptome',
} as const;

export type TEntityTypeDict = (typeof EntityTypeDict)[keyof typeof EntityTypeDict];
export type TEntityTypeWithBrainRegionDict =
  (typeof EntityTypeWithBrainRegionDict)[keyof typeof EntityTypeWithBrainRegionDict];

export type TEntityTypeDictKey = keyof typeof EntityTypeDict;
export const EntityTypeByKeyDict = new Proxy({} as { [K in TEntityTypeDictKey]: K }, {
  get: (_, prop: string) => prop,
});
