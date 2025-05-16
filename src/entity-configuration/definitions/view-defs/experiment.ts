import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { DataType } from '@/constants/explore-section/list-views';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [DataType.SingleNeuronSimulation]: {
    title: 'Simulation',
    group: DataTypeGroup.SimulationData,
    name: EntitySlug.SingleNeuronSimulation,
    curated: false,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.CreationDate,
      EntityCoreFields.SynaptomeUsedMEModelName,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.SimulationSeed,
      EntityCoreFields.InjectionLocation,
      EntityCoreFields.RecordingLocation,
      EntityCoreFields.SimulationStatus,
      EntityCoreFields.SimulationResponse,
      EntityCoreFields.SimulationStimulus,
    ],
    summaryViewFields: [
      { field: EntityCoreFields.Description, className: 'col-span-3' },
      { field: EntityCoreFields.CreatedBy, className: 'col-span-1' },
      { field: EntityCoreFields.CreationDate, className: 'col-span-1' },
    ],
  },
  [DataType.SingleNeuronSynaptomeSimulation]: {
    title: 'Simulation',
    group: DataTypeGroup.SimulationData,
    name: EntitySlug.SingleNeuronSynaptomeSimulation,
    curated: false,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.SimulationStimulus,
      EntityCoreFields.SimulationResponse,
      EntityCoreFields.SimulationSynaptomeModel,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    summaryViewFields: [
      { field: EntityCoreFields.Description, className: 'col-span-3' },
      { field: EntityCoreFields.CreatedBy, className: 'col-span-1' },
      { field: EntityCoreFields.CreationDate, className: 'col-span-1' },
    ],
  },
};
