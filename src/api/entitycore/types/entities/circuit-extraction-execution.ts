import { z } from 'zod';
import type { IActivityFilter } from '@/api/entitycore/types/shared/activity';
import type {
  ActivityType,
  EntityAuthorization,
  EntityCoreIdentifiable,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export enum CircuitExtractionExecutionStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
}

export type TCircuitExtractionExecutionStatus = `${CircuitExtractionExecutionStatus}`;

export enum ExecutorType {
  UNICORE = 'unicore',
  LOCAL = 'local',
}

export type TExecutorType = `${ExecutorType}`;

interface NestedEntityRead extends EntityCoreIdentifiable {
  type: string | null;
}

interface ICircuitExtractionExecutionBase {
  status: TCircuitExtractionExecutionStatus;
  executor: TExecutorType | null;
  execution_id: string | null;
  start_time: string | null;
  end_time: string | null;
  used: Array<NestedEntityRead>;
  generated: Array<NestedEntityRead>;
}

export interface ICircuitExtractionExecution
  extends EntityCoreIdentifiable,
    ICircuitExtractionExecutionBase,
    Timestamps,
    EntityAuthorization,
    ActivityType {}

export interface ICircuitExtractionExecutionFilter extends IActivityFilter {
  executor?: TExecutorType | null;
  execution_id?: string | null;
  status?: TCircuitExtractionExecutionStatus | null;
}

const CreateCircuitExtractionExecutionSchema = z.object({
  status: z.nativeEnum(CircuitExtractionExecutionStatus),
  executor: z.nativeEnum(ExecutorType).optional().nullable(),
  execution_id: z.string().uuid().optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  used_ids: z.array(z.string().uuid()).default([]),
  generated_ids: z.array(z.string().uuid()).default([]),
  authorized_public: z.boolean().default(false),
});

export type TCreateCircuitExtractionExecution = z.infer<
  typeof CreateCircuitExtractionExecutionSchema
>;

const UpdateCircuitExtractionExecutionSchema = z.object({
  status: z.nativeEnum(CircuitExtractionExecutionStatus).optional().nullable(),
  executor: z.nativeEnum(ExecutorType).optional().nullable(),
  execution_id: z.string().uuid().optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  generated_ids: z.array(z.string().uuid()).optional().nullable(),
});

export type TUpdateCircuitExtractionExecution = z.infer<
  typeof UpdateCircuitExtractionExecutionSchema
>;
