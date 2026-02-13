import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  TActivityType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  OwnershipFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

interface IUsedEntity extends EntityCoreIdentifiable, EntityAuthorization {}
interface IGeneratedEntity extends EntityCoreIdentifiable, EntityAuthorization {}

interface IActivityBase<
  UsedEntityT extends EntityCoreIdentifiable,
  GeneratedEntityT extends EntityCoreIdentifiable,
> {
  start_time: string;
  end_time: string;
  used: UsedEntityT[];
  generated?: GeneratedEntityT[];
}

export interface IActivity
  extends EntityCoreIdentifiable,
    IActivityBase<IUsedEntity, IGeneratedEntity>,
    Timestamps,
    EntityAuthorization,
    TActivityType {}

interface IActivityFilterBase {
  used__id?: string | null;
  used__id__in?: string | Array<string> | null;
  used__type?: string | null;
  generated__id?: string | null;
  generated__id__in?: string[] | null;
  generated__type?: string | null;
}

export interface IActivityFilter
  extends IActivityFilterBase,
    ContributionFilter,
    SharedFilter,
    PaginationFilter,
    OwnershipFilter {}
