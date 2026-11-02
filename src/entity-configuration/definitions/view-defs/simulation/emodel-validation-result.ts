import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForEModelValidationResult: ViewDefinitionConfig = {
  title: 'E-model validation',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.EModelValidationResult,
  // A task result has no e-type, brain region or species of its own, so the table shows only
  // what the entity actually carries.
  columns: [EntityCoreFields.Name, EntityCoreFields.Description, EntityCoreFields.RegistrationDate],
  summaryViewFields: [
    { field: EntityCoreFields.Description },
    { field: EntityCoreFields.RegistrationDate },
  ],
  miniDetailView: [
    { field: EntityCoreFields.Description },
    { field: EntityCoreFields.RegistrationDate },
  ],
};
