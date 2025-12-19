import type { IExperimentalDensity } from '@/api/entitycore/types/shared/density';
import type {
  EntityAuthorization,
  EntityCoreType,
  IMType,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionFilter,
  ContributionFilter,
  MtypeFilter,
  PaginationFilter,
  SharedFilter,
  StainFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export interface IExperimentalBoutonDensity extends IExperimentalDensity, EntityCoreType {
  mtypes: IMType[];
}

export type ExperimentalBoutonDensityFilter = Partial<
  SharedFilter &
    TimestampsFilter &
    PaginationFilter &
    ContributionFilter &
    BrainRegionFilter &
    StainFilter &
    MtypeFilter &
    EntityAuthorization
>;
