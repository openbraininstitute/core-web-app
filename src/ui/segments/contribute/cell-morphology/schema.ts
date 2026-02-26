import { z } from 'zod';

import {
  BaseSetupSchema,
  ContributionArraySchema,
  createFileSchema,
  LicenseIdSchema,
  SubjectIdSchema,
} from '@/ui/segments/contribute/shared/schemas';

export const ProtocolSchema = z
  .string({ message: 'Protocol is required' })
  .uuid()
  .nonempty({ message: 'Protocol is required' });

export const MTypeClassIdSchema = z
  .string({ message: 'M-type class is required' })
  .uuid()
  .nonempty({ message: 'M-type class is required' });

export const RepairPipelineType = {
  Raw: { key: 'raw', label: 'raw' },
  Curated: { key: 'curated', label: 'curated' },
  Unraveled: { key: 'unraveled', label: 'unraveled' },
  Repaired: { key: 'repaired', label: 'repaired' },
} as const;

export type TRepairPipelineType =
  (typeof RepairPipelineType)[keyof typeof RepairPipelineType]['key'];

export const RepairPipelineTypeSchema = z
  .enum(Object.values(RepairPipelineType).map((v) => v.key) as [string, ...string[]])
  .optional();

export const CELL_MORPHOLOGY_FILE_TYPES = [
  { type: 'swc', extension: 'swc', mimeType: 'application/swc' },
  { type: 'asc', extension: 'asc', mimeType: 'application/asc' },
  { type: 'h5', extension: 'h5', mimeType: 'application/x-hdf5' },
] as const;

export const CellMorphologyAssetsSchema = createFileSchema(['swc', 'asc', 'h5']);

export const CellMorphologySchema = z.object({
  setup: BaseSetupSchema,
  subject_id: SubjectIdSchema,
  license_id: LicenseIdSchema,
  cell_morphology_protocol_id: ProtocolSchema,
  mtype_class_id: MTypeClassIdSchema,
  repair_pipeline_state: RepairPipelineTypeSchema,
  assets: CellMorphologyAssetsSchema,
  contribution: ContributionArraySchema,
});

export type TCellMorphologyForm = z.infer<typeof CellMorphologySchema>;

export function getCellMorphologyMimeType(file: File): string | undefined {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const fileType = CELL_MORPHOLOGY_FILE_TYPES.find(
    (f) => f.extension === ext || file.type === f.mimeType
  );
  return fileType?.mimeType;
}
