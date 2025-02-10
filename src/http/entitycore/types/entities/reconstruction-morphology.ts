import {
  BrainLocationFilter,
  BrainRegionFilter,
  DateFilter,
  PaginationFilter,
} from '@/http/entitycore/types/shared/request';
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
} from '@/http/entitycore/types/shared/global';

export type ReconstructionMorphologyExpandFields =
  | 'brain_location'
  | 'species'
  | 'strain'
  | 'brain_region';
export type ReconstructionMorphologyExpand = ReconstructionMorphologyExpandFields[];

export interface IMorphologyFilter
  extends DateFilter,
    BrainLocationFilter,
    BrainRegionFilter,
    PaginationFilter {
  name__ilike?: string | null;
  species_id__in?: number[] | null;
  order_by?: string;
  search?: string | null;
}

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
  mtype?: IMType | null;
  contributors?: Array<IContributor> | null;
}

export interface IReconstructionMorphologyExpanded extends IReconstructionMorphology {
  morphology_feature_annotation: MorphologyFeatureAnnotation;
}

export type ExpandReconstructionMorphologyParm = 'morphology_feature_annotation';
