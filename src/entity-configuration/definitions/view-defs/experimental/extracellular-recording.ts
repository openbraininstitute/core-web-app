import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForExtracellularRecording: ViewDefinitionConfig = {
  title: 'Extracellular recording',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.ExtracellularRecording,
  columns: [
    EntityCoreFields.BrainRegion,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.Name,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
    EntityCoreFields.LifecycleStatus,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.License },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.License },
  ],
};
