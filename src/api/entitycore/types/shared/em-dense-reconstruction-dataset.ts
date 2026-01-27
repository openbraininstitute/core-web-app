import { z } from 'zod';

import type {
  ContributionFilter,
  IDFilter,
  OwnershipFilter,
  PaginationFilter,
  SearchFilter,
} from '@/api/entitycore/types/shared/request';

export interface IEMDenseReconstructionDatasetFilter
  extends PaginationFilter,
    OwnershipFilter,
    IDFilter,
    SearchFilter,
    ContributionFilter {
  age_value: string | null;
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
