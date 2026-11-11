import type { IExperimentalDensity } from '@/api/entitycore/types/shared/density';
import type {
  EntityAuthorization,
  EntityCoreType,
  IMType,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  BrainRegionHierarchyFilter,
  ContributionFilter,
  IlikeSearchFilter,
  MtypeFilter,
  PaginationFilter,
  SharedFilter,
  StainFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export interface IExperimentalBoutonDensity extends IExperimentalDensity, EntityCoreType {
  mtypes: Array<IMType>;
}

export type ExperimentalBoutonDensityFilter = Partial<
  SharedFilter &
    TimestampsFilter &
    PaginationFilter &
    ContributionFilter &
    BrainRegionFilter &
    BrainRegionHierarchyFilter &
    StainFilter &
    MtypeFilter &
    EntityAuthorization &
    IlikeSearchFilter
>;
