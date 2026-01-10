import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  BrainLocationFilter,
  BrainRegionHierarchyFilter,
  ContributionFilter,
  TimestampsFilter,
  PaginationFilter,
  SharedFilter,
  SubjectFilter,
  IDFilter,
  MtypeFilter,
  IlikeSearchFilter,
  OwnershipFilter,
} from '@/api/entitycore/types/shared/request';
import type {
  EntityCoreIdentifiable,
  EntityCoreBaseAsset,
  EntityAuthorization,
  IContributor,
  Timestamps,
  ILicense,
  Subject,
  IMType,
  EntityCoreType,
  EntityCoreOwnership,
} from '@/api/entitycore/types/shared/global';

/**
 * How an EM cell mesh was created.
    static: The mesh was precomputed at a given level of detail.
    dynamic: The mesh was dynamically generated at query time.
 */
export const EMCellMeshTypeDict = {
  Static: {
    key: 'static',
    label: 'Static',
  },
  Dynamic: {
    key: 'dynamic',
    label: 'Dynamic',
  },
} as const;
export const EMCellMeshTypeDictionary = Object.fromEntries(
  Object.entries(EMCellMeshTypeDict).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof EMCellMeshTypeDict]: (typeof EMCellMeshTypeDict)[K]['key'];
};

export type TEMCellMeshType =
  (typeof EMCellMeshTypeDictionary)[keyof typeof EMCellMeshTypeDictionary];

export const EMCellMeshGenerationMethodDict = {
  MarchingCubes: {
    key: 'marching_cubes',
    label: 'Marching cubes',
  },
} as const;

export const EMCellMeshGenerationMethodDictionary = Object.fromEntries(
  Object.entries(EMCellMeshGenerationMethodDict).map(([name, value]) => [name, value.key])
) as {
  [K in keyof typeof EMCellMeshGenerationMethodDict]: (typeof EMCellMeshGenerationMethodDict)[K]['key'];
};

export type TEMCellMeshGenerationMethod =
  (typeof EMCellMeshGenerationMethodDictionary)[keyof typeof EMCellMeshGenerationMethodDictionary];

export interface IEmCellMeshQueryFilters
  extends IDFilter,
    TimestampsFilter,
    BrainLocationFilter,
    ContributionFilter,
    BrainRegionHierarchyFilter,
    PaginationFilter,
    MtypeFilter,
    SubjectFilter,
    SharedFilter,
    IlikeSearchFilter,
    OwnershipFilter {
  release_version?: number | null;
  dense_reconstruction_cell_id?: number | null;
  level_of_detail?: number | null;
  mesh_type?: TEMCellMeshType | null;

  measurement_annotation__creation_date__lte?: string | null; // ISO date-time
  measurement_annotation__creation_date__gte?: string | null;
  measurement_annotation__update_date__lte?: string | null;
  measurement_annotation__update_date__gte?: string | null;

  // Measurement metadata
  measurement_kind__pref_label?: string | null;
  measurement_kind__structural_domain?: string | null;
  measurement_item__name?: string | null;
  measurement_item__unit?: string | null;
  measurement_item__value__gte?: number | null;
  measurement_item__value__lte?: number | null;

  // EM dense reconstruction dataset
  em_dense_reconstruction_dataset__name?: string | null;
  em_dense_reconstruction_dataset__name__in?: Array<string> | null;
  em_dense_reconstruction_dataset__name__ilike?: string | null;
  em_dense_reconstruction_dataset__creation_date__lte?: string | null;
  em_dense_reconstruction_dataset__creation_date__gte?: string | null;
  em_dense_reconstruction_dataset__update_date__lte?: string | null;
  em_dense_reconstruction_dataset__update_date__gte?: string | null;
  em_dense_reconstruction_dataset__authorized_public?: boolean | null;
  em_dense_reconstruction_dataset?: string | null;
  em_dense_reconstruction_dataset__id?: string | null;
  em_dense_reconstruction_dataset__id__in?: Array<string> | null;
  em_dense_reconstruction_dataset__experiment_date__lte?: string | null;
  em_dense_reconstruction_dataset__experiment_date__gte?: string | null;
  em_dense_reconstruction_dataset__contact_email?: string | null;
  em_dense_reconstruction_dataset__order_by?: Array<string>;
}
export interface IEMCellMeshBase {
  release_version: number;
  dense_reconstruction_cell_id: number;
  generation_method: TEMCellMeshGenerationMethod;
  level_of_detail: number;
  generation_parameters?: Record<string, unknown> | null;
  mesh_type: TEMCellMeshType;
}

export interface IEMCellMesh
  extends EntityCoreIdentifiable,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreType,
    EntityCoreOwnership,
    Subject,
    Timestamps,
    IEMCellMeshBase {
  contributions?: Array<IContributor> | null;
  license?: ILicense | null;
  brain_region: BrainRegionHierarchyBase;
  mtypes: Array<IMType> | null;
  em_dense_reconstruction_dataset: EntityCoreIdentifiable & EntityCoreType;
}
