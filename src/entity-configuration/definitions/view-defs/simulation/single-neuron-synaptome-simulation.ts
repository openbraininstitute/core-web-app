import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

export const viewDefForSingleNeuronSynaptomeSimulation: ViewDefinitionConfig = {
  title: 'Synaptome simulations',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.SingleNeuronSynaptomeSimulation,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.SimulationStimulus,
    EntityCoreFields.SimulationResponse,
    EntityCoreFields.SynaptomeModelName,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.CreationDate,
    EntityCoreFields.RegistrationDate,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.CreatedBy },
    { field: EntityCoreFields.CreationDate },
  ],
  miniDetailView: [
    { field: EntityCoreFields.SynaptomeModelName },
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.CreationDate },
  ],
};
