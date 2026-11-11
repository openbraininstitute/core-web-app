import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const viewDefForIonChannelModelSimulation: ViewDefinitionConfig = {
  title: 'Ion channel model simulation',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.IonChannelModelSimulation,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
    EntityCoreFields.LifecycleStatus,
    EntityCoreFields.LegacyActivityStatus,
  ],
  filterableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  displayableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  miniDetailView: [
    { field: EntityCoreFields.RegistrationDate },
    { field: EntityCoreFields.LegacyActivityStatus },
  ],
};
