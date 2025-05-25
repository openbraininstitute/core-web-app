import { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
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
  IContributor,
  Timestamps,
  ILicense,
  ISpecies,
  IStrain,
  IMType,
  EntityCoreType,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';
import { MeasurementAnnotation } from '@/api/entitycore/types/entities/measurement-annotation';

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

export interface IReconstructionMorphologyBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
}

export interface IReconstructionMorphology
  extends IReconstructionMorphologyBase,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership {
  license?: ILicense | null;
  species: ISpecies;
  strain?: IStrain | null;
  brain_region: BrainRegionHierarchyBase;
  mtypes: Array<IMType> | null;
  contributions?: Array<IContributor> | null;
}

export interface IReconstructionMorphologyExpanded extends IReconstructionMorphology {
  measurement_annotation: MeasurementAnnotation;
}

export type ExpandReconstructionMorphologyParm = 'measurement_annotation';
