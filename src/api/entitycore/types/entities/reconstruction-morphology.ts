import {
  BrainLocationFilter,
  BrainRegionFilter,
  ContributionFilter,
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  SpeciesFilter,
  StainFilter,
} from '@/api/entitycore/types/shared/request';
import {
  IBrainLocation,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
  Timestamps,
  Measurement,
  IMType,
  IContributor,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityAuthorization,
} from '@/api/entitycore/types/shared/global';

export type ReconstructionMorphologyExpandFields =
  | 'brain_location'
  | 'species'
  | 'strain'
  | 'brain_region';
export type ReconstructionMorphologyExpand = ReconstructionMorphologyExpandFields[];

type MtypeFilter = {
  mtype__id: string | null;
  mtype_pref_label: string | null;
  mtype_pref_label__in: string | null;
  mtype__order_by: string | null;
};

type IDFilter = {
  id__in: string | null;
};

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

export interface IReconstructionMorphology
  extends EntityCoreIdentifiable,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  mtypes: Array<IMType> | null;
  contributions?: Array<IContributor> | null;
  type: 'reconstruction-morphology';
}

export interface IReconstructionMorphologyExpanded extends IReconstructionMorphology {
  morphology_feature_annotation: MorphologyFeatureAnnotation;
}

export type ExpandReconstructionMorphologyParm = 'morphology_feature_annotation';
