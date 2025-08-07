import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreType,
} from '@/api/entitycore/types/shared/global';
import type { EntityTypeWithBrainRegionEnum } from '@/api/entitycore/types/entity-type';

export interface IEntity extends EntityCoreIdentifiable, EntityCoreType, EntityAuthorization {}

export type EntityCountResponse = Record<EntityTypeWithBrainRegionEnum, number>;
