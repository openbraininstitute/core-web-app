import { z } from 'zod';
import {
  EntitycoreExecutionStatus,
  ExecutorType,
  type IEntitycoreExecution,
  type TEntitycoreExecutionStatus,
  type TExecutorType,
} from '@/api/entitycore/types/entities/execution';
import type { IActivityFilter } from '@/api/entitycore/types/shared/activity';
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

interface ICircuitExtractionExecutionBase extends IEntitycoreExecution {}

export interface ICircuitExtractionExecution
  extends EntityCoreIdentifiable,
    ICircuitExtractionExecutionBase,
    Timestamps,
    EntityAuthorization {}

export interface ICircuitExtractionExecutionFilter extends IActivityFilter {
  executor?: TExecutorType | null;
  execution_id?: string | null;
  status?: TEntitycoreExecutionStatus | null;
}

const CreateCircuitExtractionExecutionSchema = z.object({
  status: z.nativeEnum(EntitycoreExecutionStatus),
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
  status: z.nativeEnum(EntitycoreExecutionStatus).optional().nullable(),
  executor: z.nativeEnum(ExecutorType).optional().nullable(),
  execution_id: z.string().uuid().optional().nullable(),
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  generated_ids: z.array(z.string().uuid()).optional().nullable(),
});

export type TUpdateCircuitExtractionExecution = z.infer<
  typeof UpdateCircuitExtractionExecutionSchema
>;
