import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { DataType } from '@/constants/explore-section/list-views';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  TypeSummaryProps,
  ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';

export const CommonSummaryViewFields = [
  { field: EntityCoreFields.Description, className: 'col-span-3' },
  { field: EntityCoreFields.Contributions },
  { field: EntityCoreFields.CreationDate },
] as TypeSummaryProps[];

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [DataType.CircuitEModel]: {
    title: 'E-model',
    group: DataTypeGroup.ModelData,
    name: EntitySlug.EModel,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.EModelResponse,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.MType,
      EntityCoreFields.EType,
      EntityCoreFields.EModelExemplarMorphology,
      EntityCoreFields.EModelScore,
      EntityCoreFields.Contributions,
      EntityCoreFields.CreationDate,
    ],
    curated: true,
    summaryViewFields: [
      { field: EntityCoreFields.BrainRegion },
      { field: EntityCoreFields.EModelScore },
      { field: EntityCoreFields.MType, className: 'col-span-3' },
      { field: EntityCoreFields.EType },
    ],
  },
  [DataType.CircuitMEModel]: {
    title: 'ME-model',
    group: DataTypeGroup.ModelData,
    name: EntitySlug.MeModel,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.MEModelMorphologyPreview,
      EntityCoreFields.MEModelTracePreview,
      EntityCoreFields.MEModelValidationStatus,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.MType,
      EntityCoreFields.EType,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    curated: false,
    summaryViewFields: [
      { field: EntityCoreFields.BrainRegion, className: 'col-span-2' },
      { field: EntityCoreFields.MEModelValidationStatus, className: 'col-span-2' },
      { field: EntityCoreFields.MType, className: 'col-span-4' },
      { field: EntityCoreFields.EType, className: 'col-span-4' },
    ],
  },
  [DataType.SingleNeuronSynaptome]: {
    title: 'Synaptome',
    group: DataTypeGroup.ModelData,
    name: EntitySlug.SingleNeuronSynaptome,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.SynaptomeUsedMEModelName,
      EntityCoreFields.MType,
      EntityCoreFields.EType,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    curated: false,
    summaryViewFields: [
      { field: EntityCoreFields.BrainRegion, className: 'col-span-1' },
      { field: EntityCoreFields.License, className: 'col-span-1' },
    ],
  },
};
