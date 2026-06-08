import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '../types';

export const ViewDefForMEModelWithSynapsesCircuit: ViewDefinitionConfig = {
  title: 'Synaptome',
  name: EntitySlug.MEModelWithSynapses,
  curated: false,
  columns: [
    EntityCoreFields.Download,
    EntityCoreFields.Name,
    EntityCoreFields.Description,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.CircuitNumberSynapses,
    EntityCoreFields.CircuitNumberConnections,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.CircuitBuildCategory,
    EntityCoreFields.ArtifactPublishedIn,
    EntityCoreFields.ArtifactExperimentDate,
    EntityCoreFields.CreatedBy,
    EntityCoreFields.RegistrationDate,
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.CircuitNumberSynapses },
    { field: EntityCoreFields.CircuitNumberConnections },
    { field: EntityCoreFields.CircuitBuildCategory },
    { field: EntityCoreFields.RegistrationDate },
    { field: EntityCoreFields.License },
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.CircuitRootCircuit },
    { field: EntityCoreFields.License },
    { field: EntityCoreFields.CircuitNumberConnections },
    { field: EntityCoreFields.CircuitNumberSynapses },
    { field: EntityCoreFields.ArtifactPublishedIn },
    { field: EntityCoreFields.ArtifactExperimentDate },
    { field: EntityCoreFields.ArtifactContactEmail },
  ],
};
