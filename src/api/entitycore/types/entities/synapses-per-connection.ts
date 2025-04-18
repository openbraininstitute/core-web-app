import {
  Timestamps,
  IBrainRegion,
  EntityCoreIdentifiable,
  IMType,
} from '@/api/entitycore/types/shared/global';
import {
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  ContributionFilter,
  BrainRegionFilter,
  SpeciesFilter,
  EtypeFilter,
  StainFilter,
} from '@/api/entitycore/types/shared/request';
import { IExperimentalDensity } from '@/api/entitycore/types/shared/density';

interface SynapticPathway extends EntityCoreIdentifiable, Timestamps {
  pre_mtype: IMType;
  post_mtype: IMType;
  pre_region: IBrainRegion;
  post_region: IBrainRegion;
}

export interface IExperimentalSynapsesPerConnection extends IExperimentalDensity {
  mtypes: Array<IMType> | null;
  synaptic_pathway: SynapticPathway;
  type: 'experimental_synapses_per_connection';
}

export type ExperimentalSynapsesPerConnectionFilter = Partial<
  SharedFilter &
    TimestampsFilter &
    PaginationFilter &
    ContributionFilter &
    BrainRegionFilter &
    SpeciesFilter &
    StainFilter &
    EtypeFilter
>;
