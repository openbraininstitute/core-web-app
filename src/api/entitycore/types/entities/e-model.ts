import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type {
  EntityCoreIdentifiable,
  EntityAuthorization,
  PointLocationBase,
  IBrainRegion,
  IContributor,
  Timestamps,
  ISpecies,
  IStrain,
  IEType,
  IMType,
} from '@/api/entitycore/types/shared/global';
import type {
  ContributionFilter,
  IMorphologyFilter,
  BrainRegionFilter,
  SpeciesFilter,
  SharedFilter,
  MtypeFilter,
  EtypeFilter,
} from '@/api/entitycore/types/shared/request';

interface ExemplarMorphology extends Timestamps, EntityCoreIdentifiable {
  name: string;
  description: string;
  location: PointLocationBase | null;
  legacy_id: Array<string> | null;
}

export interface IEModelBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  iteration: string;
  score: number;
  seed: number;
}

export interface IEModel extends IEModelBase, Timestamps, EntityAuthorization {
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  contributions?: Array<IContributor> | null;
  mtypes: Array<IMType> | null;
  etypes: Array<IEType> | null;
  exemplar_morphology: ExemplarMorphology;
  type: EntityTypeEnum.Emodel;
}

export interface IEModelFilter
  extends ContributionFilter,
    MtypeFilter,
    EtypeFilter,
    SpeciesFilter,
    BrainRegionFilter,
    SharedFilter,
    IMorphologyFilter {
  score__lte: number | null;
  score__gte: number | null;
}
