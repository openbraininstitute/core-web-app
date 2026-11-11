import { EntitySlug } from '@/entity-configuration/domain/slug';

import { EntityCoreFields } from '../../fields-defs/enums';
import { DataTypeGroup, type ViewDefinitionConfig } from '../types';

export const ViewDefForEmodel: ViewDefinitionConfig = {
  title: 'E-model',
  group: DataTypeGroup.ModelData,
  name: EntitySlug.EModel,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.EModelResponse,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.MType,
    EntityCoreFields.EType,
    EntityCoreFields.EModelExemplarMorphology,
    EntityCoreFields.EModelScore,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
    EntityCoreFields.LifecycleStatus,
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
