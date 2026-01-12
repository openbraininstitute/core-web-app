import type {
  ContributionFilter,
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  IDFilter,
  IlikeSearchFilter,
} from '@/api/entitycore/types/shared/request';
import type {
  EntityCoreIdentifiable,
  EntityCoreBaseAsset,
  EntityAuthorization,
  Timestamps,
  EntityCoreType,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';

export type NotebookFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    PaginationFilter &
    SharedFilter &
    IlikeSearchFilter
>;

export interface INotebook
  extends EntityCoreIdentifiable,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership {
  name: string;
  description: string;
}
