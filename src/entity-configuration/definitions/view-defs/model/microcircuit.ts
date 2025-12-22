import { ViewDefinitionConfig } from '../types';
import { EntityCoreFields } from '../../fields-defs/enums';

import { EntitySlug } from '@/entity-configuration/domain/slug';

export const ViewDefForMicrocircuit: ViewDefinitionConfig = {
  title: 'Microcircuit',
  name: EntitySlug.Microcircuit,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.CircuitNumberNeurons,
    EntityCoreFields.CircuitNumberSynapses,
    EntityCoreFields.CircuitNumberConnections,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
};
