import {
  EntityAuthorization,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import { IEntity } from '@/api/entitycore/types/entities/entity';

export interface IActivity
  extends EntityCoreIdentifiable,
    Timestamps,
    EntityCoreOwnership,
    EntityAuthorization,
    EntityCoreType {
  start_time?: string | null;
  end_time?: string | null;
  used: Array<IEntity>;
  generated: Array<IEntity>;
}
