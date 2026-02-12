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

export interface TEntityCoreNestedEntityBase {
  id: string;
  type: string;
  authorized_project_id: string;
  authorized_public: boolean;
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
  generated: Array<TEntityCoreNestedEntityBase>;
  used: Array<TEntityCoreNestedEntityBase>;
}
