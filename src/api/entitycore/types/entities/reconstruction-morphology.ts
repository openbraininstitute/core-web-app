import {
  BrainLocationFilter,
  BrainRegionFilter,
  ContributionFilter,
  DateFilter,
  PaginationFilter,
} from '@/api/entitycore/types/shared/request';
import {
  IBrainLocation,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
  AuditMetadata,
  Measurement,
  IMType,
  IContributor,
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
}
type SpeciesFilter = {
  species__id: string | null;
  species__name: string | null;
  species__name__in: string | null;
  species__order_by: string | null;
}
type StainFilter = {
  strain__id: string | null;
  strain__name: string | null;
  strain__name__in: string | null;
  strain__order_by: string | null;
}
export type IMorphologyFilter = Partial<
  DateFilter &
  BrainLocationFilter &
  ContributionFilter &
  BrainRegionFilter &
  PaginationFilter &
  MtypeFilter &
  SpeciesFilter &
  StainFilter & {
    name__ilike: string | null;
    order_by: string;
    search: string | null;
  }
>;

export type MorphologyFeatureAnnotation = {
  reconstruction_morphology_id: number;
  measurements: Array<Measurement>;
};

export interface IReconstructionMorphology extends AuditMetadata {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
  mtypes: Array<IMType> | null;
  contributors?: Array<IContributor> | null;
  type: "reconstruction-morphology",
}

export interface IReconstructionMorphologyExpanded extends IReconstructionMorphology {
  morphology_feature_annotation: MorphologyFeatureAnnotation;
}

export type ExpandReconstructionMorphologyParm = 'morphology_feature_annotation';
