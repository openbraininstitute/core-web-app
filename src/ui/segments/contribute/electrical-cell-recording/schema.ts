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
export const ETypeClassIdSchema = z.uuid().nonempty({
  error: 'E-type class is required',
});

/**
 * additional fields specific to electrical cell recording
 */
export const ElectricalCellRecordingSetupExtension = z.object({
  ljp: z
    .number({
      error: (issue) =>
        issue.input === undefined ? undefined : 'Liquid junction potential (ljp) must be a number',
    })
    .optional()
    .prefault(0.0),
  temperature: z
    .number({
      error: (issue) => (issue.input === undefined ? undefined : 'Temperature must be a number'),
    })
    .optional()
    .nullable(),
  recording_location: z.string({ error: 'Cell recording location is required' }),
  recording_type: z.string().nonempty({ error: 'Cell recording type is required' }),
  recording_origin: z
    .string()
    .nonempty({ error: 'Cell recording origin is required' })
    .prefault('in_vitro'),
  comment: z.string().optional().nullable(),
});

/**
 * extended setup schema for electrical cell recording
 */
export const ElectricalCellRecordingSetupSchema = BaseSetupSchema.extend(
  ElectricalCellRecordingSetupExtension.shape
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
