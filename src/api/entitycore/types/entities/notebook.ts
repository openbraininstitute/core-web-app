import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiableNamed,
  EntityCoreOwnership,
  EntityCoreType,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  PaginationFilter,
  SharedFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export type NotebookFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    PaginationFilter &
    SharedFilter &
    IlikeSearchFilter
>;

export interface INotebook
  extends EntityCoreIdentifiableNamed,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership {
  description: string;
  specifications: Object;
  scale: string;
}
