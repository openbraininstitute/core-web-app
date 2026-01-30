// schema.ts

import z from 'zod';

import { BaseSetupSchema, ContributionArraySchema } from '@/ui/segments/contribute/shared';
import { MeasurementUnit } from '@/api/entitycore/types/shared/global';

const measurementSchema = z.object({
  name: z.string().optional(),
  unit: z.literal(MeasurementUnit.linear_density__1_um),
  value: z.number().optional(),
});

export type TMeasurement = z.infer<typeof measurementSchema>;

const MeasurementArraySchema = z.array(measurementSchema).superRefine((arr, ctx) => {
  let hasFullyFilledMeasurement = false;

  if (arr.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one measurement is required',
      path: [],
    });
    return;
  }

  arr.forEach((measurement, idx) => {
    const filledFields = [measurement.name, measurement.value].filter(
      (field) => field !== undefined && field !== null && field !== ''
    );

    // If partially filled (has name OR value but not both)
    // Partial fill is length > 0 and length < 2
    if (filledFields.length > 0 && filledFields.length < 2) {
      if (!measurement.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Measurement name is required',
          path: [idx, 'name'],
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

    if (measurement.name && measurement.value !== undefined && measurement.value !== null) {
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

export const ExperimentalBoutonDensitySchema = z.object({
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
  mtype_class_id: z
    .string({ message: 'M-type class is required' })
    .uuid()
    .nonempty({ message: 'M-type class is required' }),

  measurements: MeasurementArraySchema,
  contribution: ContributionArraySchema,
});

export type TExperimentalBoutonDensityForm = z.infer<typeof ExperimentalBoutonDensitySchema>;
