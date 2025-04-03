import {
  DateMetadata,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
} from '@/api/entitycore/types/shared/global';
import { DateFilter, PaginationFilter, SharedFilter } from '@/api/entitycore/types/shared/request';

export interface IExperimentalBoutonDensity extends DateMetadata {
  name: string;
  description: string;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  type: 'experimental_bouton_density';
}

export type ExperimentalBoutonDensityFilter = Partial<DateFilter & PaginationFilter & SharedFilter>;
