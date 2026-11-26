import { z } from 'zod';

import {
  EMCellMeshGenerationMethodDictionary,
  EMCellMeshTypeDictionary,
} from '@/api/entitycore/types/entities/em-cell-mesh';
import {
  ContributionArraySchema,
  LicenseIdSchema,
  SubjectIdSchema,
} from '@/ui/segments/contribute/shared/schemas';
import { valuesToEnumTuple } from '@/utils/array';

import type dayjs from 'dayjs';

const CELL_ID_DIGITS = /^\d+$/;
const BIGINT_MAX = BigInt('9223372036854775807');
const INT32_MAX = 2_147_483_647;

function fitsInBigint(id: string) {
  return !CELL_ID_DIGITS.test(id) || BigInt(id) <= BIGINT_MAX;
}

const ExperimentDateSchema = z.custom<dayjs.Dayjs | Date | string>((val) => !!val, {
  error: 'Experiment date is required',
});

export const SetupSchema = z.object({
  name: z.string({ error: 'Name is required' }).nonempty({ error: 'Name is required' }),
  description: z
    .string({ error: 'Description is required' })
    .nonempty({ error: 'Description is required' }),
  brain_region_id: z.uuid().nonempty({ error: 'Brain region is required' }),
  experiment_date: ExperimentDateSchema,
  contact_email: z
    .email({ error: 'Contact email should be a valid email' })
    .nullish()
    .or(z.literal('')),
  published_in: z.string().nullish().or(z.literal('')),
  notice_text: z.string().nullish().or(z.literal('')),

  em_dense_reconstruction_dataset_id: z.uuid({ error: 'Dataset ID is required' }),
  dense_reconstruction_cell_id: z
    .string({ error: 'Dense reconstruction cell id is required' })
    .regex(CELL_ID_DIGITS, { error: 'Dense reconstruction cell id must be a whole number' })
    .refine(fitsInBigint, { error: 'Dense reconstruction cell id is too large' }),

  release_version: z
    .number({ error: 'Release version is required' })
    .int({ error: 'Release version must be a whole number' })
    .min(0, { error: 'Release version cannot be negative' })
    .max(INT32_MAX, { error: 'Release version is too large' }),
  level_of_detail: z
    .number({ error: 'Level of detail is required' })
    .int({ error: 'Level of detail must be a whole number' })
    .min(0, { error: 'Level of detail cannot be negative' })
    .max(INT32_MAX, { error: 'Level of detail is too large' }),

  generation_method: z
    .enum(valuesToEnumTuple(EMCellMeshGenerationMethodDictionary))
    .prefault(EMCellMeshGenerationMethodDictionary.MarchingCubes),
  mesh_type: z.enum(valuesToEnumTuple(EMCellMeshTypeDictionary), {
    error: 'Mesh type is required',
  }),
});

export const MTypeClassIdSchema = z.uuid().nonempty({
  error: 'M-type class is required',
});

export const EM_CELL_MESH_FILE_TYPES = [
  { type: 'obj', extension: 'obj', mimeType: 'application/obj' },
  { type: 'glb', extension: 'glb', mimeType: 'model/gltf-binary' },
] as const;

function getEMCellMeshFileType(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return EM_CELL_MESH_FILE_TYPES.find(
    (f) => f.extension === ext || file.type.toLowerCase() === f.mimeType.toLowerCase()
  );
}

export const EMCellMeshAssetsSchema = z.object({
  mesh: z.instanceof(File).refine((file) => Boolean(getEMCellMeshFileType(file)), {
    error: 'File must be a .obj or .glb file',
  }),
});

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
  return getEMCellMeshFileType(file)?.mimeType;
}
