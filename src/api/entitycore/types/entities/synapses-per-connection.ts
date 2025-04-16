import {
  Timestamps,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
  EntityCoreIdentifiable,
} from '@/api/entitycore/types/shared/global';
import {
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

export interface IExperimentalSynapsesPerConnection extends EntityCoreIdentifiable, Timestamps {
  name: string;
  description: string;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  type: 'experimental_synapses_per_connection';
}

export type ExperimentalSynapsesPerConnectionFilter = Partial<
  TimestampsFilter & PaginationFilter & SharedFilter
>;
