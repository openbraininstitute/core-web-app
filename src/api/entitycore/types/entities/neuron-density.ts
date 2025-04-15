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

export interface IExperimentalNeuronDensity extends Timestamps, EntityCoreIdentifiable {
  name: string;
  description: string;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  type: 'experimental_neuron_density';
}

export type ExperimentalNeuronDensityFilter = Partial<
  TimestampsFilter & PaginationFilter & SharedFilter
>;
