import { ViewDefinitionConfig } from '../types';
import { EntityCoreFields } from '../../fields-defs/enums';

import { EntitySlug } from '@/entity-configuration/domain/slug';

export const ViewDefForMEModelWithSynapsesCircuit: ViewDefinitionConfig = {
  title: 'Synaptome (beta)',
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
    EntityCoreFields.CircuitPublishedIn,
    EntityCoreFields.CircuitExperimentDate,
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
    { field: EntityCoreFields.CircuitPublishedIn },
    { field: EntityCoreFields.CircuitExperimentDate },
    { field: EntityCoreFields.CircuitContactEmail },
  ],
};
