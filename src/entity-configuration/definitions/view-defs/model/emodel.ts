import { DataTypeGroup, ViewDefinitionConfig } from '../types';
import { EntityCoreFields } from '../../fields-defs/enums';

import { EntitySlug } from '@/entity-configuration/domain/slug';

export const ViewDefForEmodel: ViewDefinitionConfig = {
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
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.StrainName },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.EModelScore },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.RegistrationDate },
    { field: EntityCoreFields.License },
  ],
};
