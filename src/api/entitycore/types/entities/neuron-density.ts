import type { EntityCoreType, IEType, IMType } from '@/api/entitycore/types/shared/global';
import type {
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  ContributionFilter,
  BrainRegionFilter,
  StainFilter,
  EtypeFilter,
  MtypeFilter,
  SubjectFilter,
} from '@/api/entitycore/types/shared/request';
import type { IExperimentalDensity } from '@/api/entitycore/types/shared/density';

export interface IExperimentalNeuronDensity extends IExperimentalDensity, EntityCoreType {
  mtypes: Array<IMType> | null;
  etypes: Array<IEType> | null;
}

export type ExperimentalNeuronDensityFilter = Partial<
  SharedFilter &
    TimestampsFilter &
    PaginationFilter &
    ContributionFilter &
    BrainRegionFilter &
    SubjectFilter &
    StainFilter &
    EtypeFilter &
    MtypeFilter
>;
