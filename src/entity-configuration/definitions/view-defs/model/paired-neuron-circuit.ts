import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewDefForPairedNeuronCircuit: ViewDefinitionConfig = {
  title: 'Paired neurons',
  name: EntitySlug.PairedNeuronsCircuit,
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
