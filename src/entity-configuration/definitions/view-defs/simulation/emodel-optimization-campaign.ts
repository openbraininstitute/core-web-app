import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  DataTypeGroup,
  type ViewDefinitionConfig,
} from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const viewDefForEModelOptimizationCampaign: ViewDefinitionConfig = {
  title: 'E-model optimisation',
  group: DataTypeGroup.SimulationData,
  name: EntitySlug.EModelOptimization,
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
