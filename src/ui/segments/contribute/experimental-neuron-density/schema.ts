import z from 'zod';

import { BaseSetupSchema, ContributionArraySchema } from '@/ui/segments/contribute/shared';

const measurementSchema = z.object({
  name: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((val) => (val === null ? undefined : val)),
  // CHANGE 1: Hardcode unit to '1/mm3' as a required literal
  unit: z.literal('1/mm³'),
  value: z
    .union([z.number(), z.null(), z.undefined()])
    .optional()
    .transform((val) => (val === null ? undefined : val)),
});

export type TMeasurement = z.infer<typeof measurementSchema>;

const MeasurementArraySchema = z.array(measurementSchema).superRefine((arr, ctx) => {
  let hasFullyFilledMeasurement = false;

  // FIX: This section is corrected to enforce at least one measurement.
  if (arr.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one measurement is required',
      path: [],
    });
    return;
  }
  // END FIX

  arr.forEach((measurement, idx) => {
    // CHANGE 2: Only check name and value (2 fields) since unit is hardcoded/fixed
    const filledFields = [measurement.name, measurement.value].filter(
      (field) => field !== undefined && field !== null && field !== ''
    );

    // Partial fill is when length > 0 and length < 2
    if (filledFields.length > 0 && filledFields.length < 2) {
      if (!measurement.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Measurement name is required',
          path: [idx, 'name'],
        });
      }
      // REMOVED: unit validation check
      if (measurement.value === undefined || measurement.value === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Measurement value is required',
          path: [idx, 'value'],
        });
      }
    }

    // CHANGE 3: Fully filled check is now for 2 fields (name and value)
    if (filledFields.length === 2) {
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
  mtype_class_id: z.string({ message: 'M-type class is optional' }).uuid().optional(),
  etype_class_id: z.string({ message: 'E-type class is optional' }).uuid().optional(),

  measurements: MeasurementArraySchema,
  contribution: ContributionArraySchema,
});

export type TExperimentalNeuronDensityForm = z.infer<typeof ExperimentalNeuronDensitySchema>;
