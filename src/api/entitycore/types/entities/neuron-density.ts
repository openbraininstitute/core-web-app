import {
  DateMetadata,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
} from '@/api/entitycore/types/shared/global';

export interface IExperimentalNeuronDensity extends DateMetadata {
  name: string;
  description: string;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  type: 'experimental_neuron_density';
}
