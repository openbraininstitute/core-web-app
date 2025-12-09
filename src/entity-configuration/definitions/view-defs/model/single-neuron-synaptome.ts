import { DataTypeGroup, ViewDefinitionConfig } from '../types';
import { EntityCoreFields } from '../../fields-defs/enums';

import { EntitySlug } from '@/entity-configuration/domain/slug';

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
    EntityCoreFields.CreationDate,
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
