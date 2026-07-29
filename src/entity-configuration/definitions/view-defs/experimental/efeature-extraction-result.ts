import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForEFeatureExtractionResult: ViewDefinitionConfig = {
  title: 'Intracellular e-feature extraction',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.EFeatureExtractionResult,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.EType,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.RegistrationDate,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
  ],
  miniDetailView: [
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
  ],
};
