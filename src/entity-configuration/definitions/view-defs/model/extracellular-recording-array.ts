import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewDefForExtracellularRecordingArray: ViewDefinitionConfig = {
  title: 'Extracellular recording array',
  name: EntitySlug.ExtracellularRecordingArray,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.RecordingArrayCircuit,
    EntityCoreFields.ElectrodeType,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  miniDetailView: [
    { field: EntityCoreFields.RecordingArrayCircuit },
    { field: EntityCoreFields.ElectrodeType },
    { field: EntityCoreFields.Description },
    { field: EntityCoreFields.CreatedBy },
    { field: EntityCoreFields.RegistrationDate },
  ],
};
