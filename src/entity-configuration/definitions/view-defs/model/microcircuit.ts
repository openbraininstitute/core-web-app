import { EntitySlug } from '@/entity-configuration/domain/slug';

import { EntityCoreFields } from '../../fields-defs/enums';

import type { ViewDefinitionConfig } from '../types';

export const ViewDefForMicrocircuit: ViewDefinitionConfig = {
  title: 'Microcircuit',
  name: EntitySlug.Microcircuit,
  curated: false,
  columns: [
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.CircuitScale,
    EntityCoreFields.CircuitNumberNeurons,
    EntityCoreFields.CircuitNumberSynapses,
    EntityCoreFields.CircuitNumberConnections,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  miniDetailView: [
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.CircuitScale },
    { field: EntityCoreFields.CircuitSubCircuit },
    { field: EntityCoreFields.CircuitNumberNeurons },
    { field: EntityCoreFields.CircuitNumberSynapses },
    { field: EntityCoreFields.CircuitNumberConnections },
    { field: EntityCoreFields.CircuitBuildCategory },
    { field: EntityCoreFields.RegistrationDate },
    { field: EntityCoreFields.License },
  ],
};
