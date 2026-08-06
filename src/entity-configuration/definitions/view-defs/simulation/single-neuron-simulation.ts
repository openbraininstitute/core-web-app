import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const viewDefForSingleNeuronSimulation: ViewDefinitionConfig = {
  title: 'Simulation',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.SingleNeuronSimulation,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.SimulationModel,
    EntityCoreFields.SimulationStimulus,
    EntityCoreFields.SimulationResponse,
    EntityCoreFields.InjectionLocation,
    EntityCoreFields.RecordingLocation,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
    EntityCoreFields.LifecycleStatus,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.CreatedBy },
    { field: EntityCoreFields.RegistrationDate },
  ],
  miniDetailView: [
    { field: EntityCoreFields.SimulationModel },
    { field: EntityCoreFields.InjectionLocation },
    { field: EntityCoreFields.RecordingLocation },
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.RegistrationDate },
  ],
};
