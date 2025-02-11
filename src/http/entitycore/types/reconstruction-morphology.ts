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
  order_by?: string[];
  search?: string | null;
}

export interface ReconstructionMorphology extends IAuditMetadata {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: IBrainRegion;
}
