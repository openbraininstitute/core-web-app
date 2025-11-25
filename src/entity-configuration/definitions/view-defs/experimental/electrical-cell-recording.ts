import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForElectricalCellRecording: ViewDefinitionConfig = {
  title: 'Single cell electrophysiology',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.ElectricalCellRecording,
  columns: [
    EntityCoreFields.Preview,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.EType,
    EntityCoreFields.Name,
    EntityCoreFields.Species,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.License },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.SubjectAge },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.License },
  ],
  curated: true,
  mlTopic: 'Neuron spike',
};
