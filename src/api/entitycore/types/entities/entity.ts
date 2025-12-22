import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreType,
} from '@/api/entitycore/types/shared/global';
import type { TEntityTypeWithBrainRegionDict } from '@/api/entitycore/types/entity-type';

export interface IEntity extends EntityCoreIdentifiable, EntityCoreType, EntityAuthorization {}

export type EntityCountResponse = Record<TEntityTypeWithBrainRegionDict, number>;
