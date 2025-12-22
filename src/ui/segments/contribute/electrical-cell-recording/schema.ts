import { upperFirst } from 'es-toolkit/compat';
import { z } from 'zod';

import {
  BaseSetupSchema,
  ContributionArraySchema,
  createFileSchema,
  LicenseIdSchema,
  SubjectIdSchema,
} from '@/ui/segments/contribute/shared/schemas';

/**
 * e-type
 */
export const ETypeClassIdSchema = z
  .string({ message: 'E-type class is required' })
  .uuid()
  .nonempty({ message: 'E-type class is required' });

/**
 * additional fields specific to electrical cell recording
 */
export const ElectricalCellRecordingSetupExtension = z.object({
  ljp: z
    .number({
      invalid_type_error: 'Liquid junction potential (ljp) must be a number',
    })
    .optional()
    .default(0.0),
  temperature: z
    .number({ invalid_type_error: 'Temperature must be a number' })
    .optional()
    .nullable(),
  recording_location: z.string({
    message: 'Cell recording location is required',
  }),
  recording_type: z.string().nonempty({ message: 'Cell recording type is required' }),
  recording_origin: z
    .string()
    .nonempty({ message: 'Cell recording origin is required' })
    .default('in_vitro'),
  comment: z.string().optional().nullable(),
});

/**
 * extended setup schema for electrical cell recording
 */
export const ElectricalCellRecordingSetupSchema = BaseSetupSchema.merge(
  ElectricalCellRecordingSetupExtension
);

/**
 * electrical cell recording asset file types
 */
export const ELECTRICAL_CELL_RECORDING_FILE_TYPES = [
  { type: 'nwb', extension: 'nwb', mimeType: 'application/nwb' },
] as const;

/**
 * electrical cell recording assets schema
 */
export const ElectricalCellRecordingAssetsSchema = createFileSchema(['nwb']);

/**
 * complete electrical cell recording form schema
 */
export const ElectricalCellRecordingSchema = z.object({
  setup: ElectricalCellRecordingSetupSchema,
  subject_id: SubjectIdSchema,
  license_id: LicenseIdSchema,
  etype_class_id: ETypeClassIdSchema,
  assets: ElectricalCellRecordingAssetsSchema,
  contribution: ContributionArraySchema,
});

/**
 * electrical Cell Recording Form Values Type
 */
export type TElectricalCellRecordingForm = z.infer<typeof ElectricalCellRecordingSchema>;

export const RECORDING_LOCATION_OPTIONS = ['dend', 'axon', 'soma', 'apic'].map((value) => ({
  label: upperFirst(value.replace('_', ' ')),
  value,
}));
