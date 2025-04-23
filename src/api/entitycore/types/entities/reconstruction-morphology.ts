import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';

import type {
  BrainLocationFilter,
  BrainRegionFilter,
  ContributionFilter,
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  SpeciesFilter,
  StainFilter,
  IDFilter,
  MtypeFilter,
} from '@/api/entitycore/types/shared/request';
import type {
  EntityCoreIdentifiable,
  EntityCoreBaseAsset,
  EntityAuthorization,
  IBrainLocation,
  IBrainRegion,
  IContributor,
  Measurement,
  Timestamps,
  ILicense,
  ISpecies,
  IStrain,
  IMType,
} from '@/api/entitycore/types/shared/global';

export type ReconstructionMorphologyExpandFields =
  | 'brain_location'
  | 'species'
  | 'strain'
  | 'brain_region';
export type ReconstructionMorphologyExpand = ReconstructionMorphologyExpandFields[];

export type ReconstructionMorphologyFilter = Partial<
  IDFilter &
    TimestampsFilter &
    BrainLocationFilter &
    ContributionFilter &
    BrainRegionFilter &
    PaginationFilter &
    MtypeFilter &
    SpeciesFilter &
    StainFilter &
    SharedFilter
>;

export type MorphologyFeatureAnnotation = {
  reconstruction_morphology_id: number;
  measurements: Array<Measurement>;
};

export interface IReconstructionMorphologyBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
}

export interface IReconstructionMorphology
  extends IReconstructionMorphologyBase,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization {
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  mtypes: Array<IMType> | null;
  contributions?: Array<IContributor> | null;
  type: EntityTypeEnum.ReconstructionMorphology;
}

export interface IReconstructionMorphologyExpanded extends IReconstructionMorphology {
  morphology_feature_annotation: MorphologyFeatureAnnotation;
}

export type ExpandReconstructionMorphologyParm = 'morphology_feature_annotation';
