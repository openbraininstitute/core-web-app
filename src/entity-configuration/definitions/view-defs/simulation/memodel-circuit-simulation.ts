import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

export const viewDefForMEModelCircuitSimulation: ViewDefinitionConfig = {
  title: 'Single neuron simulation (beta)',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.MEModelCircuitSimulation,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.MEModelName,
    EntityCoreFields.SimulationCampaignStatus,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.CreationDate,
    EntityCoreFields.RegistrationDate,
  ],
  filterableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.Contributions,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.CreationDate,
  ],
  displayableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.Contributions,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.CreationDate,
  ],
  miniDetailView: [
    { field: EntityCoreFields.MEModelName },
    { field: EntityCoreFields.SimulationCampaignStatus },
    { field: EntityCoreFields.CreationDate },
  ],
};
