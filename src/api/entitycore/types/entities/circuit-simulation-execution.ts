import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { type IActivity, IActivityFilter } from '@/api/entitycore/types/shared/activity';
import type {
  ActivityType,
  EntityAuthorization,
  EntityCoreIdentifiable,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

enum CircuitSimulationExecutionStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
}

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
