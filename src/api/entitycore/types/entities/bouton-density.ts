import type { EntityCoreType, IMType } from '@/api/entitycore/types/shared/global';
import type {
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  ContributionFilter,
  BrainRegionFilter,
  MtypeFilter,
  SubjectFilter,
} from '@/api/entitycore/types/shared/request';
import type { IExperimentalDensity } from '@/api/entitycore/types/shared/density';

export interface IExperimentalBoutonDensity extends IExperimentalDensity, EntityCoreType {
  mtypes: Array<IMType>;
}

export type ExperimentalBoutonDensityFilter = Partial<
  SharedFilter &
    TimestampsFilter &
    PaginationFilter &
    ContributionFilter &
    BrainRegionFilter &
    MtypeFilter &
    SubjectFilter
>;
