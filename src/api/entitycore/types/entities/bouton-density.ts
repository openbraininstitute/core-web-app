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

export interface IExperimentalBoutonDensity extends EntityCoreIdentifiable, Timestamps {
  name: string;
  description: string;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  type: 'experimental_bouton_density';
}

export type ExperimentalBoutonDensityFilter = Partial<
  TimestampsFilter & PaginationFilter & SharedFilter
>;
