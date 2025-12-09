import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

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
    EntityCoreFields.SimulationStatus,
    EntityCoreFields.InjectionLocation,
    EntityCoreFields.RecordingLocation,
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
    { field: EntityCoreFields.SimulationModel },
    { field: EntityCoreFields.SimulationStatus },
    { field: EntityCoreFields.InjectionLocation },
    { field: EntityCoreFields.RecordingLocation },
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.CreationDate },
  ],
};
