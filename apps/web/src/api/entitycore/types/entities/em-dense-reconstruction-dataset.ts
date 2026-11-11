import { z } from 'zod';

import type {
  EntityAuthorization,
  EntityCoreBaseAsset,
  EntityCoreIdentifiableNamed,
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
  extends EntityCoreIdentifiableNamed,
    IEMDenseReconstructionDatasetBase,
    EntityCoreBaseAsset,
    EntityAuthorization,
    EntityCoreOwnership,
    EntityCoreType,
    Timestamps,
    Subject {
  description: string;
  contributions?: IContributor[] | null;
  license?: ILicense | null;
  brain_region: BrainRegionHierarchyBase;
}

export const EMDenseReconstructionDatasetBaseSchema = z.object({
  name: z
    .string({ message: 'EMDenseReconstructionDataset name is required' })
    .nonempty({ message: 'EMDenseReconstructionDataset name is required' }),
  description: z
    .string({ message: 'EMDenseReconstructionDataset description is required' })
    .nonempty({ message: 'EMDenseReconstructionDataset description is required' }),
  protocol_document: z.string().nullish(),
  fixation: z.string().nullish(),
  staining_type: z.string().nullish(),
  slicing_thickness: z.number().positive().nullish(),
  tissue_shrinkage: z.number().positive().nullish(),
  microscope_type: z.string().nullish(),
  detector: z.string().nullish(),
  slicing_direction: z.string().nullish(),
  landmarks: z.string().nullish(),
  voltage: z.number().nullish(),
  current: z.number().nullish(),
  dose: z.number().positive().nullish(),
  temperature: z.number().positive().nullish(),

  volume_resolution_x_nm: z.number().positive().nullish(),
  volume_resolution_y_nm: z.number().positive().nullish(),
  volume_resolution_z_nm: z.number().positive().nullish(),
  release_url: z.string().nullish(),
  cave_client_url: z.string().nullish(),
  cave_datastack: z.string().nullish(),
  precomputed_mesh_url: z.string().nullish(),
  cell_identifying_property: z.string().nullish(),
});
