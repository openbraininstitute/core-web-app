import { DataTypeGroup, ViewDefinitionConfig } from '../types';
import { EntityCoreFields } from '../../fields-defs/enums';

import { EntitySlug } from '@/entity-configuration/domain/slug';

export const ViewDefForIonChannelModel: ViewDefinitionConfig = {
  title: 'Ion channel model',
  group: DataTypeGroup.ModelData,
  name: EntitySlug.IonChannelModel,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.TemperatureCelsius,
    EntityCoreFields.IsLjpCorrected,
    EntityCoreFields.IsStochastic,
    EntityCoreFields.IsTemperatureDependent,
    EntityCoreFields.Species,
    EntityCoreFields.CreationDate,
  ],
  curated: true,
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.CreationDate },
    { field: EntityCoreFields.IsLjpCorrected },
    { field: EntityCoreFields.IsStochastic },
    { field: EntityCoreFields.IsTemperatureDependent },
    { field: EntityCoreFields.TemperatureCelsius },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.CreationDate },
    { field: EntityCoreFields.IsLjpCorrected },
    { field: EntityCoreFields.IsStochastic },
    { field: EntityCoreFields.IsTemperatureDependent },
    { field: EntityCoreFields.TemperatureCelsius },
  ],
  filterableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.CreationDate,
    EntityCoreFields.IsLjpCorrected,
    EntityCoreFields.IsStochastic,
    EntityCoreFields.IsTemperatureDependent,
    EntityCoreFields.TemperatureCelsius,
  ],
};
