export enum EntityTypeEnum {
  AnalysisSoftwareSourceCode = 'analysis_software_source_code',
  Emodel = 'emodel',
  ExperimentalBoutonDensity = 'experimental_bouton_density',
  ExperimentalNeuronDensity = 'experimental_neuron_density',
  ExperimentalSynapsesPerConnection = 'experimental_synapses_per_connection',
  Memodel = 'memodel',
  Mesh = 'mesh',
  CellMorphology = 'cell_morphology',
  ElectricalCellRecording = 'electrical_cell_recording',
  SingleNeuronSimulation = 'single_neuron_simulation',
  SingleNeuronSynaptome = 'single_neuron_synaptome',
  Subject = 'subject',
  SynapticPathway = 'synaptic_pathway',
  SingleNeuronSynaptomeSimulation = 'single_neuron_synaptome_simulation',
  Circuit = 'circuit',
  CellComposition = 'cell_composition',
  BrainAtlas = 'brain_atlas',
  BrainAtlasRegion = 'brain_atlas_region',
  SimulationCampaign = 'simulation_campaign',
  Simulation = 'simulation',
}

export enum EntityTypeWithBrainRegionEnum {
  ExperimentalSynapsesPerConnection = 'experimental_synapses_per_connection',
  ExperimentalBoutonDensity = 'experimental_bouton_density',
  ExperimentalNeuronDensity = 'experimental_neuron_density',
  CellMorphology = 'cell_morphology',
  ElectricalCellRecording = 'electrical_cell_recording',
  Memodel = 'memodel',
  Emodel = 'emodel',
  Circuit = 'circuit',
  SingleNeuronSynaptome = 'single_neuron_synaptome',
}

export type EntityTypeValue = `${EntityTypeEnum}`;
export type EntityTypeWithBrainRegionValue = `${EntityTypeWithBrainRegionEnum}`;
