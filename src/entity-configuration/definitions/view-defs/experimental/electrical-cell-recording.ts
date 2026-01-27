import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

export const viewDefForElectricalCellRecording: ViewDefinitionConfig = {
  title: 'Single cell electrophysiology',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.ElectricalCellRecording,
  columns: [
    EntityCoreFields.Preview,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.EType,
    EntityCoreFields.Name,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.License },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.License },
  ],
  curated: true,
  mlTopic: 'Neuron spike',
};
