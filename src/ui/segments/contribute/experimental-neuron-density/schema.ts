import z from 'zod';

import { BaseSetupSchema, ContributionArraySchema } from '@/ui/segments/contribute/shared';

const measurementSchema = z.object({
  name: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((val) => (val === null ? undefined : val)),
  unit: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((val) => (val === null ? undefined : val)),
  value: z
    .union([z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => (val === null ? undefined : val)),
});

export type TMeasurement = z.infer<typeof measurementSchema>;

const MeasurementArraySchema = z.array(measurementSchema).superRefine((arr, ctx) => {
  let hasFullyFilledMeasurement = false;
  if (arr.length === 0) {
    return;
  }

  arr.forEach((measurement, idx) => {
    const filledFields = [measurement.name, measurement.unit, measurement.value].filter(
      (field) => field !== undefined && field !== null && field !== ''
    );

    if (filledFields.length > 0 && filledFields.length < 3) {
      if (!measurement.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Measurement name is required',
          path: [idx, 'name'],
        });
      }
      if (!measurement.unit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Measurement unit is required',
          path: [idx, 'unit'],
        });
      }
      if (measurement.value === undefined || measurement.value === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Measurement value is required',
          path: [idx, 'value'],
        });
      }
    }

    if (filledFields.length === 3) {
      hasFullyFilledMeasurement = true;
    }
  });

  if (!hasFullyFilledMeasurement) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one measurement must be fully filled',
      path: [],
    });
  }
});

export const ExperimentalNeuronDensitySchema = z.object({
  setup: BaseSetupSchema.omit({
    experiment_date: true,
    contact_email: true,
    published_in: true,
    location: true,
  }),
  subject_id: z
    .string({ message: 'Subject is required' })
    .uuid()
    .nonempty({ message: 'Subject is required' }),
  license_id: z
    .string({ message: 'License is required' })
    .uuid()
    .nonempty({ message: 'License is required' }),
  mtype_class_id: z.string({ message: 'M-type class is required' }).uuid().optional(),
  etype_class_id: z.string({ message: 'E-type class is required' }).uuid().optional(),

  measurements: MeasurementArraySchema,
  contribution: ContributionArraySchema,
});

export type TExperimentalNeuronDensityForm = z.infer<typeof ExperimentalNeuronDensitySchema>;
