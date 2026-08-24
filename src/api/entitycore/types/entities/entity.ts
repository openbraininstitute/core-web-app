import type { TEntityTypeWithBrainRegionDict } from '@/api/entitycore/types/entity-type';
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreType,
  TEntityLifecycleStatus,
} from '@/api/entitycore/types/shared/global';

export interface IEntity extends EntityCoreIdentifiable, EntityCoreType, EntityAuthorization {
  /** optional here: entitycore sets it on every entity, but older reads may predate the field. */
  lifecycle_status?: TEntityLifecycleStatus | null;
}

export type EntityCountResponse = Record<TEntityTypeWithBrainRegionDict, number>;
