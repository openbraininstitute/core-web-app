import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

export enum EntitycoreExecutionStatus {
  CREATED = 'created',
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export enum ExecutorType {
  SINGLE_NODE_JOB = 'single_node_job',
  DISTRIBUTED_JOB = 'distributed_job',
  JUPYTER_NOTEBOOK = 'jupyter_notebook',
}

export type TExecutorType = `${ExecutorType}`;

export type TEntitycoreExecutionStatus = `${EntitycoreExecutionStatus}`;

export interface EntitycoreUsedEntity
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    EntityCoreBaseAsset,
    EntityCoreType {
  name: string | null;
  description: string | null;
  contributions?: Array<IContributor> | null;
}

export interface IEntitycoreExecution
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    EntityCoreOwnership,
    Timestamps,
    EntityCoreType {
  executor: TExecutorType | null;
  execution_id: string | null;
  start_time: string;
  end_time: string | null;
  status: TEntitycoreExecutionStatus;
  generated: Array<unknown>;
  used: Array<EntitycoreUsedEntity>;
}
