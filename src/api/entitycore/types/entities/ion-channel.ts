import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type {
  EntityAuthorization,
  EntityCoreIdentifiable,
  IAsset,
  IContributor,
  ISpecies,
  IStrain,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

type UseIon = {
  ion_name: string;
  read: Array<string>;
  write: Array<string>;
  valence?: number | null;
  main_ion?: boolean | null;
};

interface NeuronBlock {
  global: Array<Record<string, string | null>>;
  range: Array<Record<string, string | null>>;
  useion: UseIon[];
  nonspecific: Array<Record<string, string | null>>;
}

type IonChannelModelBase = {
  description: string;
  name: string;
  nmodl_suffix: string;
  is_ljp_corrected: boolean;
  is_temperature_dependent: boolean;
  temperature_celsius: number;
  is_stochastic: boolean;
  neuron_block: NeuronBlock;
};

export interface IonChannelModel
  extends IonChannelModelBase,
    Timestamps,
    EntityCoreIdentifiable,
    EntityAuthorization,
    IAsset {
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegionHierarchy;
  contributions: Array<IContributor>;
}

export interface IonChannelModelCreate extends IonChannelModelBase, EntityAuthorization {
  species_id: string;
  strain_id?: string | null;
  brain_region_id: string;
}
