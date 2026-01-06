import { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  PointLocationBase,
  IContributor,
  Timestamps,
  ISpecies,
  IStrain,
  IEType,
  IMType,
  EntityCoreType,
  EntityCoreBaseAsset,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IMorphologyFilter,
  BrainRegionFilter,
  SpeciesFilter,
  SharedFilter,
  MtypeFilter,
  EtypeFilter,
  PaginationFilter,
  IlikeSearchFilter,
} from '@/api/entitycore/types/shared/request';

interface ExemplarMorphology extends Timestamps, EntityCoreIdentifiable {
  name: string;
  description: string;
  location: PointLocationBase | null;
  legacy_id: Array<string> | null;
}

interface IEModelBase extends EntityCoreIdentifiable, EntityCoreOwnership {
  name: string;
  description: string;
  iteration: string;
  score: number;
  seed: number;
}

export interface IEModel
  extends IEModelBase,
    Timestamps,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreBaseAsset {
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: BrainRegionHierarchyBase;
  contributions?: Array<IContributor> | null;
  mtypes: Array<IMType> | null;
  etypes: Array<IEType> | null;
  exemplar_morphology: ExemplarMorphology;
  ion_channel_models: Array<IonChannelModel>;
}

export interface IEModelFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    SpeciesFilter,
    BrainRegionFilter,
    SharedFilter,
    IMorphologyFilter,
    PaginationFilter,
    IlikeSearchFilter {
  score__lte: number | null;
  score__gte: number | null;
}
