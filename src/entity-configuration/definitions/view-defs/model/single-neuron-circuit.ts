import { EntitySlug } from '@/entity-configuration/domain/slug';
import { EntityCoreFields } from '../../fields-defs/enums';
import type { ViewDefinitionConfig } from '../types';

export const ViewDefForSingleNeuronCircuit: ViewDefinitionConfig = {
  title: 'Single neuron',
  name: EntitySlug.SingleNeuronCircuit,
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
