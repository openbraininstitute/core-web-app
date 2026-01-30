import type { IExperimentalDensity } from '@/api/entitycore/types/shared/density';
import type { EntityCoreType, IEType, IMType } from '@/api/entitycore/types/shared/global';
import type {
  BrainRegionHierarchyFilter,
  ContributionFilter,
  EtypeFilter,
  IlikeSearchFilter,
  MtypeFilter,
  PaginationFilter,
  SharedFilter,
  StainFilter,
  SubjectFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export interface IExperimentalNeuronDensity extends IExperimentalDensity, EntityCoreType {
  mtypes: Array<IMType> | null;
  etypes: Array<IEType> | null;
}

export type ExperimentalNeuronDensityFilter = Partial<
  SharedFilter &
    BrainRegionHierarchyFilter &
    ContributionFilter &
    EtypeFilter &
    MtypeFilter &
    PaginationFilter &
    StainFilter &
    SubjectFilter &
    TimestampsFilter &
    IlikeSearchFilter
>;
