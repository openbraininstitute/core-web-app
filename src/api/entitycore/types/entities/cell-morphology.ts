import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  CellMorphologyProtocolNestedFilter,
  NestedCellMorphologyProtocolRead,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import type { MeasurementAnnotation } from '@/api/entitycore/types/entities/measurement-annotation';
import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IBrainLocation,
  IContributor,
  ILicense,
  IMType,
  Subject,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainLocationFilter,
  BrainRegionHierarchyFilter,
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  MtypeFilter,
  PaginationFilter,
  SharedFilter,
  SubjectFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

export type CellMorphologyFilter = Partial<
  IDFilter &
    TimestampsFilter &
    BrainLocationFilter &
    ContributionFilter &
    BrainRegionHierarchyFilter &
    PaginationFilter &
    MtypeFilter &
    SubjectFilter &
    SharedFilter &
    CellMorphologyProtocolNestedFilter &
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
