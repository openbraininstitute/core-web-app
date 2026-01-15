import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiable,
  EntityCoreOwnership,
  EntityCoreType,
  IContributor,
  ILicense,
  Subject,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type {
  BrainLocationFilter,
  BrainRegionHierarchyFilter,
  ContributionFilter,
  IDFilter,
  IlikeSearchFilter,
  PaginationFilter,
  SharedFilter,
  SubjectFilter,
  TimestampsFilter,
} from '@/api/entitycore/types/shared/request';
import type { BrainRegionHierarchyBase } from './brain-region';

export type IEMDenseReconstructionDatasetFilter = Partial<
  IDFilter &
    TimestampsFilter &
    BrainLocationFilter &
    ContributionFilter &
    BrainRegionHierarchyFilter &
    PaginationFilter &
    SubjectFilter &
    SharedFilter &
    IlikeSearchFilter
>;

export const SlicingDirectionDict = {
  Coronal: {
    key: 'coronal',
    label: 'Coronal',
  },
  Sagittal: {
    key: 'sagittal',
    label: 'Sagittal',
  },
  Horizontal: {
    key: 'horizontal',
    label: 'Horizontal',
  },
  Custom: {
    key: 'custom',
    label: 'Custom',
  },
} as const;

export type TSlicingDirectionType =
  (typeof SlicingDirectionDict)[keyof typeof SlicingDirectionDict]['key'];

interface IEMDenseReconstructionDatasetBase {
  protocol_document?: string;
  fixation?: string;
  staining_type?: string;
  slicing_thickness?: number;
  tissue_shrinkage?: number;
  microscope_type?: string;
  detector?: string;
  slicing_direction?: TSlicingDirectionType;
  landmarks?: string;
  voltage?: number;
  current?: number;
  dose?: number;
  temperature?: number;

  volume_resolution_x_nm: number;
  volume_resolution_y_nm: number;
  volume_resolution_z_nm: number;
  release_url: string;
  cave_client_url: string;
  cave_datastack: string;
  precomputed_mesh_url: string;
  cell_identifying_property: string;
}

export interface IEmDenseReconstructionDataset
  extends EntityCoreIdentifiable,
    IEMDenseReconstructionDatasetBase,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreOwnership,
    EntityCoreType,
    Timestamps,
    Subject {
  contributions?: Array<IContributor> | null;
  license?: ILicense | null;
  brain_region: BrainRegionHierarchyBase;
}
