import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { DataType } from '@/constants/explore-section/list-views';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [DataType.Circuit]: {
    title: 'Circuit',
    name: EntitySlug.Circuit,
    curated: false,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.NumberNeurons,
      EntityCoreFields.NumberSynapses,
      EntityCoreFields.NumberConnections,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
  },

  [DataType.SingleNeuronSimulation]: {
    title: 'Simulation',
    group: DataTypeGroup.SimulationData,
    name: EntitySlug.SingleNeuronSimulation,
    curated: false,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.SimulationModel,
      EntityCoreFields.SimulationStimulus,
      EntityCoreFields.SimulationResponse,
      EntityCoreFields.SimulationStatus,
      EntityCoreFields.InjectionLocation,
      EntityCoreFields.RecordingLocation,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    summaryViewFields: [
      { field: EntityCoreFields.Description, className: 'col-span-3' },
      { field: EntityCoreFields.CreatedBy },
      { field: EntityCoreFields.CreationDate },
    ],
  },
  [DataType.SingleNeuronSynaptomeSimulation]: {
    title: 'Synaptome simulations',
    group: DataTypeGroup.SimulationData,
    name: EntitySlug.SingleNeuronSynaptomeSimulation,
    curated: false,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.SimulationStimulus,
      EntityCoreFields.SimulationResponse,
      EntityCoreFields.SynaptomeModelName,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    summaryViewFields: [
      { field: EntityCoreFields.Description, className: 'col-span-3' },
      { field: EntityCoreFields.CreatedBy },
      { field: EntityCoreFields.CreationDate },
    ],
  },
  [DataType.SimulationCampaign]: {
    title: 'Simulation Campaign',
    group: DataTypeGroup.SimulationData,
    name: EntitySlug.SimulationCampaign,
    curated: false,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.CircuitName,
      // EntityCoreFields.ScanParameters,
      EntityCoreFields.SimulationCampaignStatus,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    filterableFields: [
      EntityCoreFields.Name,
      EntityCoreFields.Contributions,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    displayableFields: [
      EntityCoreFields.Name,
      EntityCoreFields.Contributions,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
  },
};
