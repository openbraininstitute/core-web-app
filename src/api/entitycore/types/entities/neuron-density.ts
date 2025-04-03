import {
  DateMetadata,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
} from '@/api/entitycore/types/shared/global';
import { DateFilter, PaginationFilter, SharedFilter } from '@/api/entitycore/types/shared/request';

export interface IExperimentalNeuronDensity extends DateMetadata {
  name: string;
  description: string;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  type: 'experimental_neuron_density';
}

export type ExperimentalNeuronDensityFilter = Partial<DateFilter & PaginationFilter & SharedFilter>;
