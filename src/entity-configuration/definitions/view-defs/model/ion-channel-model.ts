import { DataTypeGroup, ViewDefinitionConfig } from '../types';
import { EntityCoreFields } from '../../fields-defs/enums';

import { EntitySlug } from '@/entity-configuration/domain/slug';

export const ViewDefForIonChannelModel: ViewDefinitionConfig = {
  title: 'Ion channel model',
  group: DataTypeGroup.ModelData,
  name: EntitySlug.IonChannelModel,
  columns: [
    EntityCoreFields.Preview,
    EntityCoreFields.Name,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.Species,
    EntityCoreFields.TemperatureCelsius,
    EntityCoreFields.IsTemperatureDependent,
    EntityCoreFields.IsLjpCorrected,
    EntityCoreFields.CreationDate,
  ],
  curated: true,
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.TemperatureCelsius },
    { field: EntityCoreFields.IsTemperatureDependent },
    { field: EntityCoreFields.IsLjpCorrected },
    { field: EntityCoreFields.IsStochastic },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.TemperatureCelsius },
    { field: EntityCoreFields.IsTemperatureDependent },
    { field: EntityCoreFields.IsLjpCorrected },
    { field: EntityCoreFields.IsStochastic },
  ],
  filterableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.Species,
    EntityCoreFields.TemperatureCelsius,
    EntityCoreFields.IsTemperatureDependent,
    EntityCoreFields.IsLjpCorrected,
    EntityCoreFields.CreationDate,
  ],
};
