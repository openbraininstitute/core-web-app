import { z } from 'zod';

import {
  RepairPipelineType,
  type TRepairPipelineType,
} from '@/api/entitycore/types/entities/cell-morphology';
import {
  BaseSetupSchema,
  ContributionArraySchema,
  createFileSchema,
  LicenseIdSchema,
  SubjectIdSchema,
} from '@/ui/segments/contribute/shared/schemas';

export const ProtocolSchema = z.uuid().nonempty({ error: 'Protocol is required' });

export const MTypeClassIdSchema = z.uuid().nonempty({ error: 'M-type class is required' });

export const RepairPipelineTypeSchema = z
  .enum(Object.values(RepairPipelineType).map((v) => v.key) as [string, ...string[]])
  .optional();

export const CELL_MORPHOLOGY_FILE_TYPES = [
  { type: 'swc', extension: 'swc', mimeType: 'application/swc' },
  { type: 'asc', extension: 'asc', mimeType: 'application/asc' },
  { type: 'h5', extension: 'h5', mimeType: 'application/x-hdf5' },
] as const;

// A file that fails validation is kept as-is, with no conversions, so only one format is present.
export const CellMorphologyAssetsSchema = createFileSchema(['swc', 'asc', 'h5'])
  .partial()
  .refine((assets) => Object.values(assets).some((file) => file instanceof File), {
    error: 'A morphology file is required',
  });

export const CellMorphologySchema = z.object({
  setup: BaseSetupSchema,
  subject_id: SubjectIdSchema,
  license_id: LicenseIdSchema,
  cell_morphology_protocol_id: ProtocolSchema,
  mtype_class_id: MTypeClassIdSchema,
  repair_pipeline_state: RepairPipelineTypeSchema,
  /** Written by the protocol step; steers the post-create redirect, never sent to the API. */
  _protocol_generation_type: z.string().nullish(),
  assets: CellMorphologyAssetsSchema,
  contribution: ContributionArraySchema,
});

export type TCellMorphologyForm = z.infer<typeof CellMorphologySchema>;

export function getCellMorphologyMimeType(file: File): string | undefined {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const fileType = CELL_MORPHOLOGY_FILE_TYPES.find(
    (f) => f.extension === ext || file.type.toLowerCase() === f.mimeType.toLowerCase()
  );
  return fileType?.mimeType;
}
