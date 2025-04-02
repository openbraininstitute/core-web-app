import {
  DateMetadata,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
} from '@/api/entitycore/types/shared/global';

export interface IExperimentalBoutonDensity extends DateMetadata {
  name: string;
  description: string;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  type: 'experimental_bouton_density';
}
