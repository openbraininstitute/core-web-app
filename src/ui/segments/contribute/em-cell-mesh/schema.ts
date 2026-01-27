import { z } from 'zod';

import {
  ContributionArraySchema,
  createFileSchema,
  LicenseIdSchema,
  SubjectIdSchema,
} from '@/ui/segments/contribute/shared/schemas';

const ExperimentDateSchema = z.any().refine((val) => !!val, {
  message: 'Experiment date is required',
});

export const SetupSchema = z.object({
  name: z.string({ message: 'Name is required' }).nonempty({ message: 'Name is required' }),
  description: z
    .string({ message: 'Description is required' })
    .nonempty({ message: 'Description is required' }),
  brain_region_id: z
    .string({ message: 'Brain region is required' })
    .uuid()
    .nonempty({ message: 'Brain region is required' }),
  experiment_date: ExperimentDateSchema,
  contact_email: z
    .string()
    .email({ message: 'Contact email should be a valid email' })
    .nullish()
    .or(z.literal('')),
  published_in: z.string().nullish().or(z.literal('')),
  notice_text: z.string().nullish().or(z.literal('')),

  // Required UUID Field
  em_dense_reconstruction_dataset_id: z
    .string({ message: 'Dataset ID is required' })
    .uuid({ message: 'Dataset ID must be a valid UUID' }),
  dense_reconstruction_cell_id: z.coerce.number().int(),

  // Fields changed to integers via coercion
  release_version: z.coerce.number().int().nullish(),
  level_of_detail: z.coerce.number().int().nullish(),

  // Dropdown options enforced by Enums
  generation_method: z.enum(['marching_cubes']).default('marching_cubes'),
  mesh_type: z.enum(['static', 'dynamic']).nullish(),

  generation_parameters: z.string().nullish().or(z.literal('')),
});

export const MTypeClassIdSchema = z
  .string({ message: 'M-type class is required' })
  .uuid()
  .nonempty({ message: 'M-type class is required' });

export const EM_CELL_MESH_FILE_TYPES = [
  { type: 'obj', extension: 'obj', mimeType: 'application/obj' },
] as const;

export const EMCellMeshAssetsSchema = createFileSchema(['obj']);

export const EMCellMeshSchema = z.object({
  setup: SetupSchema,
  subject_id: SubjectIdSchema,
  license_id: LicenseIdSchema,
  mtype_class_id: MTypeClassIdSchema,
  assets: EMCellMeshAssetsSchema,
  contribution: ContributionArraySchema,
});

export type TEMCellMeshForm = z.infer<typeof EMCellMeshSchema>;

export function getEMCellMeshMimeType(file: File): string | undefined {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const fileType = EM_CELL_MESH_FILE_TYPES.find(
    (f) => f.extension === ext || file.type === f.mimeType
  );
  return fileType?.mimeType;
}
