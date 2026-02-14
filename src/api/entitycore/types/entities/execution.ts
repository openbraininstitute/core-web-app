import z from 'zod';

import {
  ActivityStatus,
  type IActivity,
  type IActivityFilter,
  type TActivityStatus,
} from '@/api/entitycore/types/shared/activity';

export const ExecutorType = {
  SingleNodeJob: 'single_node_job',
  DistributedJob: 'distributed_job',
  JupyterNotebook: 'jupyter_notebook',
} as const;

export type TExecutorType = (typeof ExecutorType)[keyof typeof ExecutorType];

export interface IExecutionActivity extends IActivity {
  executor: TExecutorType | null;
  execution_id: string | null;
}

export interface IExecutionActivityFilter extends IActivityFilter {
  executor?: TExecutorType | null;
  execution_id?: string | null;
  status?: TActivityStatus | null;
}

const CreateExecutionActivitySchema = z.object({
  status: z.nativeEnum(ActivityStatus),
  executor: z.nativeEnum(ExecutorType).optional().nullable(),
  execution_id: z.string().uuid().optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  used_ids: z.array(z.string().uuid()).default([]),
  generated_ids: z.array(z.string().uuid()).default([]),
  authorized_public: z.boolean().default(false),
});

export type TCreateCircuitExtractionExecution = z.infer<typeof CreateExecutionActivitySchema>;

const UpdateExecutionActivitySchema = z.object({
  status: z.nativeEnum(ActivityStatus).optional().nullable(),
  executor: z.nativeEnum(ExecutorType).optional().nullable(),
  execution_id: z.string().uuid().optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  generated_ids: z.array(z.string().uuid()).optional().nullable(),
});

export type TUpdateExecutionActivity = z.infer<typeof UpdateExecutionActivitySchema>;
