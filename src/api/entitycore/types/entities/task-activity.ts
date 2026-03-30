import { z } from 'zod';

import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  IDFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export enum ActivityStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export type TActivityStatus = `${ActivityStatus}`;

export const TaskActivityType = {
  CircuitSimulationConfigGeneration: 'circuit_simulation__config_generation',
  CircuitSimulationExecution: 'circuit_simulation__execution',
  CircuitExtractionConfigGeneration: 'circuit_extraction__config_generation',
  CircuitExtractionExecution: 'circuit_extraction__execution',
  IonChannelModelingConfigGeneration: 'ion_channel_modeling__config_generation',
  IonChannelModelingExecution: 'ion_channel_modeling__execution',
  SkeletonizationConfigGeneration: 'skeletonization__config_generation',
  SkeletonizationExecution: 'skeletonization__execution',
  IonChannelSimulationConfigGeneration: 'ion_channel_simulation__config_generation',
  IonChannelSimulationExecution: 'ion_channel_simulation__execution',
  EmSynapseMappingConfigGeneration: 'em_synapse_mapping__config_generation',
  EmSynapseMappingExecution: 'em_synapse_mapping__execution',
} as const;

export type TTaskActivityType = (typeof TaskActivityType)[keyof typeof TaskActivityType];

export const ExecutorType = {
  SingleNodeJob: 'single_node_job',
  DistributedJob: 'distributed_job',
  JupyterNotebook: 'jupyter_notebook',
} as const;

export type TExecutorType = (typeof ExecutorType)[keyof typeof ExecutorType];

export interface ITaskActivityEntityRef {
  id: string;
  type?: string | null;
  name?: string | null;
}

export interface ITaskActivityBase {
  executor: TExecutorType | null;
  execution_id: string | null;
  task_activity_type: TTaskActivityType | null;
  start_time: string | null;
  end_time: string | null;
  status: ActivityStatus;
  used: Array<ITaskActivityEntityRef>;
  generated: Array<ITaskActivityEntityRef>;
}

export interface ITaskActivity
  extends ITaskActivityBase,
    EntityCoreIdentifiable,
    Timestamps,
    EntityAuthorization,
    EntityCoreOwnership {
  type?: string | null;
}

export interface ITaskActivityTypeFilter {
  task_activity_type?: TTaskActivityType | null;
}

export interface ITaskActivityExecutorFilter {
  executor?: TExecutorType | null;
  execution_id?: string | null;
}

export interface ITaskActivityStatusFilter {
  status?: ActivityStatus | null;
}

export interface ITaskActivityTimeFilter {
  start_time?: string | null;
  end_time?: string | null;
}

export interface ITaskActivityUsedFilter {
  used__id?: string | null;
  used__id__in?: string[] | null;
  used__type?: string | null;
}

export interface ITaskActivityGeneratedFilter {
  generated__id?: string | null;
  generated__id__in?: string[] | null;
  generated__type?: string | null;
}

export interface ITaskActivityFilter
  extends PaginationFilter,
    TimestampsFilter,
    OwnershipFilter,
    SearchFilter,
    IDFilter,
    ITaskActivityTypeFilter,
    ITaskActivityExecutorFilter,
    ITaskActivityStatusFilter,
    ITaskActivityTimeFilter,
    ITaskActivityUsedFilter,
    ITaskActivityGeneratedFilter {
  with_facets?: boolean;
  order_by?: string[];
}

const CreateTaskActivitySchema = z.object({
  executor: z.string().nullish(),
  execution_id: z.string().uuid().nullish(),
  task_activity_type: z.string().nullish(),
  start_time: z.string().nullish(),
  end_time: z.string().nullish(),
  status: z.string().default('done'),
  used_ids: z.array(z.uuid()).default([]),
  generated_ids: z.array(z.uuid()).default([]),
  authorized_public: z.boolean().default(false),
});

export type TCreateTaskActivity = z.infer<typeof CreateTaskActivitySchema>;

const UpdateTaskActivitySchema = z.object({
  executor: z.string().nullish(),
  execution_id: z.uuid().nullish(),
  task_activity_type: z.string().nullish(),
  start_time: z.string().nullish(),
  end_time: z.string().nullish(),
  status: z.string().optional(),
  generated_ids: z.array(z.uuid()).optional(),
});

export type TUpdateTaskActivity = z.infer<typeof UpdateTaskActivitySchema>;
