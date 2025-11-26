import { ViewDefinitionConfig } from '../types';
import { EntityCoreFields } from '../../fields-defs/enums';

import { EntitySlug } from '@/entity-configuration/domain/slug';

export const ViewDefForCircuit: ViewDefinitionConfig = {
  title: 'Circuit',
  name: EntitySlug.Circuit,
  curated: false,
  columns: [
    EntityCoreFields.Download,
    EntityCoreFields.Name,
    EntityCoreFields.CircuitSubCircuit,
    EntityCoreFields.Description,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.CircuitScale,
    EntityCoreFields.CircuitNumberNeurons,
    EntityCoreFields.CircuitNumberSynapses,
    EntityCoreFields.CircuitNumberConnections,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.CircuitBuildCategory,
    EntityCoreFields.CircuitPublishedIn,
    EntityCoreFields.CircuitExperimentDate,
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
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.CircuitRootCircuit },
    { field: EntityCoreFields.CircuitScale },
    { field: EntityCoreFields.License },
    { field: EntityCoreFields.CircuitNumberNeurons },
    { field: EntityCoreFields.CircuitNumberConnections },
    { field: EntityCoreFields.CircuitNumberSynapses },
    { field: EntityCoreFields.CircuitPublishedIn },
    { field: EntityCoreFields.CircuitExperimentDate },
    { field: EntityCoreFields.CircuitContactEmail },
  ],
};
