import {
  BrainLocationFilter,
  BrainRegionFilter,
  DateFilter,
  PaginationFilter,
} from '@/http/entitycore/types/request-shared-type';
import {
  IBrainLocation,
  IBrainRegion,
  ILicense,
  ISpecies,
  IStrain,
  IAuditMetadata,
  Measurement,
} from '@/http/entitycore/types/shared';

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

export interface IReconstructionMorphology extends IAuditMetadata {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
}
export interface IReconstructionMorphologyExpanded extends IReconstructionMorphology {
  morphology_feature_annotation: MorphologyFeatureAnnotation;
}

export type ExpandReconstructionMorphologyParm = 'morphology_feature_annotation';
