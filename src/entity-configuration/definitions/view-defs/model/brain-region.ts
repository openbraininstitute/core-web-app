import { EntitySlug } from '@/entity-configuration/domain/slug';

import { EntityCoreFields } from '../../fields-defs/enums';

import type { ViewDefinitionConfig } from '../types';

export const ViewDefForBrainRegion: ViewDefinitionConfig = {
  title: 'Brain Region',
  name: EntitySlug.BrainRegion,
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
    EntityCoreFields.LifecycleStatus,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.CircuitScale },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.CircuitSubCircuit },
    { field: EntityCoreFields.CircuitNumberNeurons },
    { field: EntityCoreFields.CircuitNumberSynapses },
    { field: EntityCoreFields.CircuitNumberConnections },
    { field: EntityCoreFields.CircuitBuildCategory },
    { field: EntityCoreFields.RegistrationDate },
    { field: EntityCoreFields.License },
  ],
};
