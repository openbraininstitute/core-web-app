import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

export const viewDefForPairedNeuronCircuitSimulation: ViewDefinitionConfig = {
  title: 'Paired Neurons Simulation',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.PairedNeuronCircuitSimulation,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.CircuitName,
    EntityCoreFields.SimulationCampaignStatus,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.CreationDate,
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
    { field: EntityCoreFields.CircuitName },
    { field: EntityCoreFields.SimulationCampaignStatus },
    { field: EntityCoreFields.CreationDate },
  ],
};
