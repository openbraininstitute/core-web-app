export enum EntityTypeEnum {
  AnalysisSoftwareSourceCode = 'analysis_software_source_code',
  Emodel = 'emodel',
  ExperimentalBoutonDensity = 'experimental_bouton_density',
  ExperimentalNeuronDensity = 'experimental_neuron_density',
  ExperimentalSynapsesPerConnection = 'experimental_synapses_per_connection',
  Memodel = 'memodel',
  Mesh = 'mesh',
  ReconstructionMorphology = 'reconstruction_morphology',
  ElectricalCellRecording = 'electrical_cell_recording',
  SingleNeuronSimulation = 'single_neuron_simulation',
  SingleNeuronSynaptome = 'single_neuron_synaptome',
  Subject = 'subject',
  SynapticPathway = 'synaptic_pathway',
  SingleNeuronSynaptomeSimulation = 'single_neuron_synaptome_simulation',
  Circuit = 'circuit',
}

export type EntityTypeUnion = keyof typeof EntityTypeEnum;
export type EntityTypeValue = `${EntityTypeEnum}`;
