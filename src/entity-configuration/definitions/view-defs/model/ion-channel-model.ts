import { EntitySlug } from '@/entity-configuration/domain/slug';
import { EntityCoreFields } from '../../fields-defs/enums';
import { DataTypeGroup, type ViewDefinitionConfig } from '../types';

export const ViewDefForIonChannelModel: ViewDefinitionConfig = {
  title: 'Ion channel model',
  group: DataTypeGroup.ModelData,
  name: EntitySlug.IonChannelModel,
  columns: [
    EntityCoreFields.Preview,
    EntityCoreFields.Name,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.TemperatureCelsius,
    EntityCoreFields.IsTemperatureDependent,
    EntityCoreFields.IsLjpCorrected,
    EntityCoreFields.RegistrationDate,
  ],
  curated: true,
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.TemperatureCelsius },
    { field: EntityCoreFields.IsTemperatureDependent },
    { field: EntityCoreFields.IsLjpCorrected },
    { field: EntityCoreFields.IsStochastic },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.TemperatureCelsius },
    { field: EntityCoreFields.IsTemperatureDependent },
    { field: EntityCoreFields.IsLjpCorrected },
    { field: EntityCoreFields.IsStochastic },
  ],
  filterableFields: [
    EntityCoreFields.Name,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.TemperatureCelsius,
    EntityCoreFields.IsTemperatureDependent,
    EntityCoreFields.IsLjpCorrected,
    EntityCoreFields.RegistrationDate,
  ],
};
