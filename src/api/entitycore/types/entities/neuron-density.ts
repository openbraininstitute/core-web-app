import type { IEType, IMType } from '@/api/entitycore/types/shared/global';
import type {
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  ContributionFilter,
  BrainRegionFilter,
  SpeciesFilter,
  StainFilter,
  EtypeFilter,
  MtypeFilter,
} from '@/api/entitycore/types/shared/request';
import type { IExperimentalDensity } from '@/api/entitycore/types/shared/density';

export interface IExperimentalNeuronDensity extends IExperimentalDensity {
  mtypes: Array<IMType> | null;
  etypes: Array<IEType> | null;
  type: 'experimental_neuron_density';
}

export type ExperimentalNeuronDensityFilter = Partial<
  SharedFilter &
    TimestampsFilter &
    PaginationFilter &
    ContributionFilter &
    BrainRegionFilter &
    SpeciesFilter &
    StainFilter &
    EtypeFilter &
    MtypeFilter
>;
