import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const viewDefForPairedNeuronCircuitSimulation: ViewDefinitionConfig = {
  title: 'Paired Neurons Simulation',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.PairedNeuronCircuitSimulation,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.CircuitName,
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
    { field: EntityCoreFields.CircuitName },
    { field: EntityCoreFields.LegacyActivityStatus },
    { field: EntityCoreFields.RegistrationDate },
  ],
};
