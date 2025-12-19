import { z } from 'zod';
import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import {
  EntitycoreExecutionStatus,
  type TEntitycoreExecutionStatus,
} from '@/api/entitycore/types/entities/execution';
import type { IActivity, IActivityFilter } from '@/api/entitycore/types/shared/activity';
import type {
  ActivityType,
  EntityAuthorization,
  EntityCoreIdentifiable,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

interface ICircuitSimulationExecutionBase {
  status: TEntitycoreExecutionStatus;
}

export interface ICircuitSimulationExecution
  extends EntityCoreIdentifiable,
    IActivity<ICircuitSimulation, ICircuitSimulationResult>,
    ICircuitSimulationExecutionBase,
    Timestamps,
    EntityAuthorization,
    ActivityType {}

export interface ICircuitSimulationExecutionFilter extends IActivityFilter {
  // TODO: add supported filters
}

const activityCreateSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  used_ids: z.array(z.string().uuid()),
  generated_ids: z.array(z.string().uuid()),
  authorized_public: z.boolean(),
});

const simulationExecutionCreateSchema = z
  .object({
    status: z.nativeEnum(EntitycoreExecutionStatus),
  })
  .merge(activityCreateSchema);

export type ISimulationExecutionCreate = z.infer<typeof simulationExecutionCreateSchema>;
