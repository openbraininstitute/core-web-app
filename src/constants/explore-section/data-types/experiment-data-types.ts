import { DataType } from '@/constants/explore-section/list-views';
import { EntityCoreFields, Field } from '@/constants/explore-section/fields-config/enums';
import { DataTypeConfig, DataTypeGroup } from '@/types/explore-section/data-types';

export enum ExperimentTypeNames {
  MORPHOLOGY = 'morphology',
  ELECTROPHYSIOLOGY = 'electrophysiology',
  NEURON_DENSITY = 'neuron-density',
  BOUTON_DENSITY = 'bouton-density',
  SYNAPSE_PER_CONNECTION = 'synapse-per-connection',
}

export const EXPERIMENT_DATA_TYPES: { [key: string]: DataTypeConfig } = {
  [DataType.ExperimentalNeuronMorphology]: {
    title: 'Morphology',
    group: DataTypeGroup.ExperimentalData,
    name: ExperimentTypeNames.MORPHOLOGY,
    columns: [
      EntityCoreFields.Preview,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.MType,
      EntityCoreFields.Name,
      EntityCoreFields.Species,
      EntityCoreFields.Contribution,
      EntityCoreFields.RegistrationDate,
    ],
    curated: true,
    cardViewFields: [
      {
        field: EntityCoreFields.Name,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.NeuronMorphologyWidth,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.NeuronMorphologyHeight,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.NeuronMorphologyDepth,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.AxonTotalLength,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.AxonStrahlerNumber,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.AxonArborAsymmetryIndex,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.BasalDendriticTotalLength,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.BasalDendriteStrahlerNumber,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.BasalArborAsymmetryIndex,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.ApicalDendriticTotalLength,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.ApicalDendtriteStrahlerNumber,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.SomaDiameter,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.ApicalArborAsymmetryIndex,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.BrainRegion,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.MType,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.SubjectSpecies,
        className: 'col-span-2',
      },
      {
        field: EntityCoreFields.Contributions,
        className: 'col-span-2',
      },
    ],
    mlTopic: 'Neuron morphology',
  },
  [DataType.ExperimentalElectroPhysiology]: {
    title: 'Electrophysiology',
    group: DataTypeGroup.ExperimentalData,
    name: ExperimentTypeNames.ELECTROPHYSIOLOGY,
    columns: [
      Field.Preview,
      Field.BrainRegion,
      Field.EType,
      Field.Name,
      Field.SubjectSpecies,
      Field.Contributors,
    ],
    curated: true,
    mlTopic: 'Neuron spike',
  },
  [DataType.ExperimentalNeuronDensity]: {
    title: 'Neuron density',
    group: DataTypeGroup.ExperimentalData,
    name: ExperimentTypeNames.NEURON_DENSITY,
    columns: [
      Field.BrainRegion,
      Field.MType,
      Field.EType,
      Field.NeuronDensity,
      Field.NumberOfMeasurements,
      Field.Name,
      Field.SubjectSpecies,
      Field.SubjectAge,
      Field.Contributors,
    ],
    curated: false,
    mlTopic: 'cell composition',
  },
  [DataType.ExperimentalBoutonDensity]: {
    title: 'Bouton density',
    group: DataTypeGroup.ExperimentalData,
    name: 'bouton-density',
    columns: [
      Field.BrainRegion,
      Field.MType,
      Field.MeanSTD,
      Field.Sem,
      Field.NumberOfMeasurements,
      Field.SubjectSpecies,
      Field.Contributors,
    ],
    curated: false,
    mlTopic: 'Bouton density',
  },
  [DataType.ExperimentalSynapsePerConnection]: {
    title: 'Synapse per connection',
    group: DataTypeGroup.ExperimentalData,
    name: ExperimentTypeNames.SYNAPSE_PER_CONNECTION,
    columns: [
      Field.PreSynapticBrainRegion,
      Field.PostSynapticBrainRegion,
      Field.PreSynapticCellType,
      Field.PostSynapticCellType,
      Field.MeanSTD,
      Field.SubjectSpecies,
      Field.SubjectAge,
      Field.Contributors,
    ],
    curated: false,
    mlTopic: 'Synapse per connection',
  },
};
