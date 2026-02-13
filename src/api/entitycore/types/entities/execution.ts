import z from 'zod';

import type { IActivityFilter } from '@/api/entitycore/types/shared/activity';
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export enum ActivityExecutionStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export enum ActivityExecutorType {
  SINGLE_NODE_JOB = 'single_node_job',
  DISTRIBUTED_JOB = 'distributed_job',
  JUPYTER_NOTEBOOK = 'jupyter_notebook',
}

export type TActivityExecutorType = `${ActivityExecutorType}`;
export type TActivityExecutionStatus = `${ActivityExecutionStatus}`;

export interface TNestedEntityBase {
  id: string;
  type: string;
  authorized_project_id: string;
  authorized_public: boolean;
}

export interface IExecutionActivity
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    EntityCoreOwnership,
    Timestamps,
    EntityCoreType {
  executor: TActivityExecutorType | null;
  execution_id: string | null;
  start_time: string;
  end_time: string | null;
  status: TActivityExecutionStatus;
  generated: Array<TNestedEntityBase>;
  used: Array<TNestedEntityBase>;
}

export interface IExecutionActivityFilter extends IActivityFilter {
  executor?: TActivityExecutorType | null;
  execution_id?: string | null;
  status?: TActivityExecutionStatus | null;
}

const CreateExecutionActivitySchema = z.object({
  status: z.nativeEnum(ActivityExecutionStatus),
  executor: z.nativeEnum(ActivityExecutorType).optional().nullable(),
  execution_id: z.string().uuid().optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  used_ids: z.array(z.string().uuid()).default([]),
  generated_ids: z.array(z.string().uuid()).default([]),
  authorized_public: z.boolean().default(false),
});

export type TCreateCircuitExtractionExecution = z.infer<typeof CreateExecutionActivitySchema>;

const UpdateExecutionActivitySchema = z.object({
  status: z.nativeEnum(ActivityExecutionStatus).optional().nullable(),
  executor: z.nativeEnum(ActivityExecutorType).optional().nullable(),
  execution_id: z.string().uuid().optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  generated_ids: z.array(z.string().uuid()).optional().nullable(),
});

export type TUpdateExecutionActivity = z.infer<typeof UpdateExecutionActivitySchema>;
