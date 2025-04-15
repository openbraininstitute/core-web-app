import {
  Timestamps,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
} from '@/api/entitycore/types/shared/global';
import {
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
} from '@/api/entitycore/types/shared/request';

export interface IExperimentalSynapsesPerConnection extends Timestamps {
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
