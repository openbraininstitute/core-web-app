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
}

export type TEntitycoreExecutionStatus = `${EntitycoreExecutionStatus}`;

export interface EntitycoreUsedEntity
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    EntityCoreBaseAsset,
    EntityCoreType {
  name: string | null;
  description: string | null;
  contributions?: IContributor[] | null;
}

export interface IEntitycoreExecution
  extends EntityCoreIdentifiable,
    EntityAuthorization,
    EntityCoreOwnership,
    Timestamps,
    EntityCoreType {
  start_time: string;
  end_time: string | null;
  status: TEntitycoreExecutionStatus;
  generated: unknown[];
  used: EntitycoreUsedEntity[];
}
