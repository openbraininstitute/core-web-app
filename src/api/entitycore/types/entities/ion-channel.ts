import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreType,
  IContributor,
  ISpecies,
  IStrain,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

import type {
  BrainRegionFilter,
  ContributionFilter,
  IMorphologyFilter,
  PaginationFilter,
  SharedFilter,
  SubjectFilter,
} from '@/api/entitycore/types/shared/request';

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
    EntityCoreType,
    EntityCoreBaseAsset {
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegionHierarchy;
  contributions: Array<IContributor>;
}

export interface IonChannelModelFilter
  extends ContributionFilter,
    BrainRegionFilter,
    IMorphologyFilter,
    PaginationFilter,
    SharedFilter,
    SubjectFilter {}
