import { DataType } from '@/constants/explore-section/list-views';
import { Field } from '@/constants/explore-section/fields-config/enums';
import { DataTypeConfig, DataTypeGroup } from '@/types/explore-section/data-types';
import { SelectedBrainRegion } from '@/state/brain-regions/types';
import { findCircuitsForSelectedRegionName } from '@/services/circuits-per-region';

export enum ModelTypeNames {
  E_MODEL = 'e-model',
  ME_MODEL = 'me-model',
  SINGLE_NEURON_SYNAPTOME = 'synaptome',
  CIRCUITS = 'circuits',
}

export const MODEL_DATA_TYPES: { [key: string]: DataTypeConfig } = {
  [DataType.CircuitEModel]: {
    title: 'E-model',
    group: DataTypeGroup.ModelData,
    name: ModelTypeNames.E_MODEL,
    columns: [
      Field.Name,
      Field.EModelResponse,
      Field.BrainRegion,
      Field.MType,
      Field.EType,
      Field.EModelMorphology,
      Field.EModelScore,
      Field.BrainRegion,
      Field.Contributors,
    ],

    curated: true,
  },
  [DataType.CircuitMEModel]: {
    title: 'ME-model',
    group: DataTypeGroup.ModelData,
    name: ModelTypeNames.ME_MODEL,
    columns: [
      Field.Name,
      Field.MEModelMorphologyPreview,
      Field.MEModelResponse,
      Field.MEModelValidated,
      Field.BrainRegion,
      Field.MType,
      Field.EType,
      Field.CreatedBy,
      Field.CreationDate,
    ],

    curated: false,
  },
  [DataType.SingleNeuronSynaptome]: {
    title: 'Synaptome',
    group: DataTypeGroup.ModelData,
    name: ModelTypeNames.SINGLE_NEURON_SYNAPTOME,
    columns: [
      Field.Name,
      Field.Description,
      Field.SynatomeUsedMEModelName,
      Field.SynaptomeUsedMType,
      Field.SynaptomeUsedEType,
      Field.BrainRegion,
      Field.CreatedBy,
      Field.CreationDate,
    ],

    curated: false,
  },
  [DataType.Circuits43]: {
    title: 'Circuits #43',
    group: DataTypeGroup.ModelData,
    name: ModelTypeNames.CIRCUITS,
    columns: [Field.Name, Field.Description],
    // Overwrite the default queries
    custom: {
      totalByExperimentAndRegionsAtom: async (selectedBrainRegion: SelectedBrainRegion) => {
        const circuits = await findCircuitsForSelectedRegionName(selectedBrainRegion.title);
        return circuits.length;
      },
    },
    curated: false,
  },
} as const;
