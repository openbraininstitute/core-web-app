import {
  type BrainLocationFilter,
  type BrainRegionHierarchyFilter,
  type ContributionFilter,
  DefaultOrderBy,
  type IDFilter,
  type IlikeSearchFilter,
  type IOrderBy,
  type MtypeFilter,
  type PaginationFilter,
  type SharedFilter,
  type SubjectFilter,
  type TimestampsFilter,
} from '@/api/entitycore/types/shared/request';

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

export const RepairPipelineType = {
  Raw: {
    key: 'raw',
    label: 'Raw',
  },
  Curated: {
    key: 'curated',
    label: 'Curated',
  },
  Unraveled: {
    key: 'unraveled',
    label: 'Unraveled',
  },
  Repaired: {
    key: 'repaired',
    label: 'Repaired',
  },
} as const;

export const RepairPipelineTypeDictionary = Object.fromEntries(
  Object.entries(RepairPipelineType).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof RepairPipelineType]: (typeof RepairPipelineType)[K]['key'];
};

export type TRepairPipelineType =
  (typeof RepairPipelineTypeDictionary)[keyof typeof RepairPipelineTypeDictionary];

export const CellMorphologyOrderBy = [
  ...DefaultOrderBy,
  'has_segmented_spines',
  'brain_region__name',
  'brain_region__acronym',
  'mtype__pref_label',
  'subject__name',
  'subject__species__name',
  'subject__strain__name',
  'cell_morphology_protocol__name',
  'created_by__pref_label',
  'updated_by__pref_label',
  'cell_morphology_protocol__generation_type',
] as const;
type TCellMorphologyOrderBy = typeof CellMorphologyOrderBy;

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
    IlikeSearchFilter &
    IOrderBy<TCellMorphologyOrderBy>
> & {
  has_segmented_spines?: boolean;
};
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
  has_segmented_spines?: boolean | null;
}

export interface ICellMorphologyExpanded extends ICellMorphology {
  measurement_annotation: MeasurementAnnotation;
}

export type ExpandCellMorphologyParm = 'measurement_annotation';
