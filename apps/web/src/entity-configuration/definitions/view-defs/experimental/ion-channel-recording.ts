import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForIonChannelRecording: ViewDefinitionConfig = {
  title: 'Ion channel electrophysiology',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.IonChannelRecording,
  columns: [
    EntityCoreFields.Preview,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.IonChannel,
    EntityCoreFields.Temperature,
    EntityCoreFields.CellLine,
    EntityCoreFields.Name,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
    EntityCoreFields.LifecycleStatus,
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.IonChannel },
    { field: EntityCoreFields.Temperature },
    { field: EntityCoreFields.CellLine },
    { field: EntityCoreFields.License },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.IonChannel },
    { field: EntityCoreFields.Temperature },
    { field: EntityCoreFields.CellLine },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.License },
  ],
  curated: true,
  mlTopic: 'Neuron spike',
};
