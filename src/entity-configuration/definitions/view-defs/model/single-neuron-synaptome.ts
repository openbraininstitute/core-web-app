import { EntitySlug } from '@/entity-configuration/domain/slug';
import { EntityCoreFields } from '../../fields-defs/enums';
import { DataTypeGroup, type ViewDefinitionConfig } from '../types';

export const ViewDefForSingleNeuronSynaptome: ViewDefinitionConfig = {
  title: 'Synaptome',
  group: DataTypeGroup.ModelData,
  name: EntitySlug.SingleNeuronSynaptome,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.SynaptomeUsedMEModelName,
    EntityCoreFields.MType,
    EntityCoreFields.EType,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  curated: false,
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.License },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.SynaptomeUsedMEModelName },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SynaptomeUsedMEModelName },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.RegistrationDate },
    { field: EntityCoreFields.License },
  ],
};
