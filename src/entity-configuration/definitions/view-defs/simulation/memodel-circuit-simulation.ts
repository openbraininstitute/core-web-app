import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const viewDefForMEModelCircuitSimulation: ViewDefinitionConfig = {
  title: 'Single neuron simulation (beta)',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.MEModelCircuitSimulation,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.CircuitName,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
    EntityCoreFields.ActivityStatus,
  ],
  filterableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.Contributions,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  displayableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.Contributions,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  miniDetailView: [
    { field: EntityCoreFields.CircuitName },
    { field: EntityCoreFields.ActivityStatus },
    { field: EntityCoreFields.RegistrationDate },
  ],
};
