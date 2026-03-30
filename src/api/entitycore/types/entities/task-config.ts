import { z } from 'zod';

import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  NameFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export const TaskConfigType = {
  CircuitSimulationCampaign: 'circuit_simulation__campaign',
  CircuitSimulationConfig: 'circuit_simulation__config',
  CircuitExtractionCampaign: 'circuit_extraction__campaign',
  CircuitExtractionConfig: 'circuit_extraction__config',
  IonChannelModelingCampaign: 'ion_channel_modeling__campaign',
  IonChannelModelingConfig: 'ion_channel_modeling__config',
  SkeletonizationCampaign: 'skeletonization__campaign',
  SkeletonizationConfig: 'skeletonization__config',
  IonChannelSimulationCampaign: 'ion_channel_simulation__campaign',
  IonChannelSimulationConfig: 'ion_channel_simulation__config',
  EmSynapseMappingCampaign: 'em_synapse_mapping__campaign',
  EmSynapseMappingConfig: 'em_synapse_mapping__config',
} as const;

export type TTaskConfigType = (typeof TaskConfigType)[keyof typeof TaskConfigType];

export interface ITaskConfigInputEntity {
  id: string;
  type?: string | null;
  name?: string | null;
}

export interface ITaskConfigBase {
  name: string;
  description: string;
  task_config_type: TTaskConfigType;
  meta: Record<string, unknown>;
  task_config_generator_id: string | null;
  inputs: Array<ITaskConfigInputEntity>;
}

export interface ITaskConfig
  extends ITaskConfigBase,
    EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    Timestamps,
    EntityAuthorization,
    EntityCoreOwnership,
    EntityCoreType {
  contributions?: Array<IContributor> | null;
}

export interface ITaskConfigTypeFilter {
  task_config_type?: TTaskConfigType | null;
}

export interface ITaskConfigGeneratorFilter {
  task_config_generator_id?: string | null;
  task_config_generator_id__in?: string[] | null;
}

export interface ITaskConfigFilter
  extends PaginationFilter,
    NameFilter,
    TimestampsFilter,
    ContributionFilter,
    OwnershipFilter,
    SearchFilter,
    IlikeSearchFilter,
    IDFilter,
    ITaskConfigTypeFilter,
    ITaskConfigGeneratorFilter {
  with_facets?: boolean;
}

const CreateTaskConfigSchema = z.object({
  name: z.string().nonempty({ message: 'Name is required' }),
  description: z.string().nonempty({ message: 'Description is required' }),
  task_config_type: z.string().nonempty({ message: 'Task config type is required' }),
  meta: z.record(z.string(), z.unknown()),
  task_config_generator_id: z.uuid().nullish(),
  inputs: z.array(z.object({ id: z.string().uuid() })).default([]),
  authorized_public: z.boolean().default(false),
});

export type TCreateTaskConfig = z.infer<typeof CreateTaskConfigSchema>;

const UpdateTaskConfigSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  task_config_type: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  task_config_generator_id: z.uuid().nullish(),
  inputs: z.array(z.object({ id: z.uuid() })).optional(),
});

export type TUpdateTaskConfig = z.infer<typeof UpdateTaskConfigSchema>;
