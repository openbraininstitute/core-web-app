import type { NestedCellMorphologyProtocolRead } from '@/api/entitycore/types/entities/cell-morphology-protocol';
import type { MeasurementAnnotation } from '@/api/entitycore/types/entities/measurement-annotation';
import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  BrainLocationFilter,
  BrainRegionFilter,
  ContributionFilter,
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  SubjectFilter,
  IDFilter,
  MtypeFilter,
  IlikeSearchFilter,
} from '@/api/entitycore/types/shared/request';
import type {
  EntityCoreIdentifiable,
  EntityCoreBaseAsset,
  EntityAuthorization,
  IBrainLocation,
  IContributor,
  Timestamps,
  ILicense,
  Subject,
  IMType,
  EntityCoreType,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';

export type CellMorphologyFilter = Partial<
  IDFilter &
    TimestampsFilter &
    BrainLocationFilter &
    ContributionFilter &
    BrainRegionFilter &
    PaginationFilter &
    MtypeFilter &
    SubjectFilter &
    SharedFilter &
    IlikeSearchFilter
>;

interface ICellMorphologyBase extends EntityCoreIdentifiable {
  name: string;
  description: string;
  brain_location?: IBrainLocation | null;
}

export interface ICellMorphology
  extends ICellMorphologyBase,
    Timestamps,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership,
    Subject {
  license?: ILicense | null;
  brain_region: BrainRegionHierarchyBase;
  mtypes: Array<IMType> | null;
  contributions?: Array<IContributor> | null;
  cell_morphology_protocol: NestedCellMorphologyProtocolRead;
}

export interface ICellMorphologyExpanded extends ICellMorphology {
  measurement_annotation: MeasurementAnnotation;
}

export type ExpandCellMorphologyParm = 'measurement_annotation';
