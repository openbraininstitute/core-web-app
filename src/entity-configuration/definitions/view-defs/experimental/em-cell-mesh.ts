import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForEMCellMesh: ViewDefinitionConfig = {
  title: 'EM mesh',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.EMCellMesh,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.MeshType,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
  ],
  curated: true,
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.License },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.License },
  ],
  mlTopic: 'Em cell mesh',
};
