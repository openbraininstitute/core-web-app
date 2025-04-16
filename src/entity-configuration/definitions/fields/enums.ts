export enum CoreFieldFilterTypeEnum {
  CheckList = 'CheckList',
  DateRange = 'DateRange',
  Search = 'Search',
  Text = 'Text',
  ValueOrRange = 'ValueOrRange',
  ValueRange = 'ValueRange',
}

export enum EntityCoreFields {
  Preview = 'preview',
  Name = 'name',
  Description = 'description',
  Species = 'species',
  CreationDate = 'creation_date',
  RegistrationDate = 'registration_date',
  UpdateDate = 'update_date',
  Contribution = 'contribution',
  Contributions = 'contributions',
  License = 'license',
  BrainRegion = 'brain_region',
  MType = 'mtype',
  EType = 'etype',
  NeuronDensity = 'neuron_density', // TODO: to check new naming
  NumberOfMeasurements = 'number_of_measurements', // TODO: to check new naming
  SubjectAge = 'subject_age', // TODO: to check new naming
  Sem = 'sem', // TODO: to check new naming
  MeanSTD = 'meanstd', // TODO: to check new naming
  NeuronMorphologyWidth = 'neuronMorphologyWidth',
  NeuronMorphologyHeight = 'NeuronMorphologyHeight',
  NeuronMorphologyDepth = 'neuronMorphologyDepth',
  AxonTotalLength = 'axonTotalLength',
  AxonStrahlerNumber = 'axonStrahlerNumber',
  AxonArborAsymmetryIndex = 'axonArborAsymmetryIndex',
  BasalDendriticTotalLength = 'basalDendriticTotalLength',
  BasalDendriteStrahlerNumber = 'basalDendriteStrahlerNumber',
  BasalArborAsymmetryIndex = 'basalArborAsymmetryIndex',
  ApicalDendriticTotalLength = 'apicalDendriticTotalLength',
  ApicalDendtriteStrahlerNumber = 'apicalDendtriteStrahlerNumber',
  SomaDiameter = 'somaDiameter',
  ApicalArborAsymmetryIndex = 'apicalArborAsymmetryIndex',
  PreSynapticBrainRegion = 'preSynapticBrainRegion',
  PostSynapticBrainRegion = 'postSynapticBrainRegion',
  PreSynapticCellType = 'preSynapticCellType',
  PostSynapticCellType = 'postSynapticCellType',
}
