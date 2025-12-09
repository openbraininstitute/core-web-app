import { DataTypeGroup, ViewDefinitionConfig } from '../types';
import { EntityCoreFields } from '../../fields-defs/enums';

import { EntitySlug } from '@/entity-configuration/domain/slug';

export const ViewDefForMemodel: ViewDefinitionConfig = {
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
    EntityCoreFields.RegistrationDate,
  ],
  curated: false,
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.MEModelValidationStatus },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.StrainName },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.MEModelValidationStatus },
    { field: EntityCoreFields.RegistrationDate },
    { field: EntityCoreFields.License },
  ],
};
