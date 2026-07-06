import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiableNamed,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
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

export interface IAnalysisNotebookResult
  extends EntityCoreIdentifiableNamed,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership {
  description: string;
  lifecycle_status?: string | null;
  contributions?: Array<IContributor> | null;
}

export type TAnalysisNotebookResultFilter = Partial<
  IDFilter &
    TimestampsFilter &
    ContributionFilter &
    PaginationFilter &
    SharedFilter &
    IlikeSearchFilter
>;
