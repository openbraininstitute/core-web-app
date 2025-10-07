import { z } from 'zod';
import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { type IActivity, IActivityFilter } from '@/api/entitycore/types/shared/activity';
import type {
  ActivityType,
  EntityAuthorization,
  EntityCoreIdentifiable,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export enum CircuitSimulationExecutionStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
}

export type TCircuitSimulationExecutionStatus = `${CircuitSimulationExecutionStatus}`;

interface ICircuitSimulationExecutionBase {
  status: CircuitSimulationExecutionStatus;
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
  start_time: z.iso.datetime(),
  end_time: z.iso.datetime(),
  used_ids: z.array(z.uuid()),
  generated_ids: z.array(z.uuid()),
  authorized_public: z.boolean(),
});

const simulationExecutionCreateSchema = z
  .object({
    status: z.enum(CircuitSimulationExecutionStatus),
  })
  .extend(activityCreateSchema.shape);

export type ISimulationExecutionCreate = z.infer<typeof simulationExecutionCreateSchema>;
