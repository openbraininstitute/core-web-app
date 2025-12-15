// schema.ts

import z from 'zod';

import { BaseSetupSchema, ContributionArraySchema } from '@/ui/segments/contribute/shared';
import { MeasurementUnit } from '@/api/entitycore/types/shared/global';

const measurementSchema = z.object({
  name: z.string().optional(),
  unit: z.literal(MeasurementUnit.dimensionless),
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
    // Only check name and value since unit is always DIMENSIONLESS
    const filledFields = [measurement.name, measurement.value].filter(
      (field) => field !== undefined && field !== null && field !== ''
    );

    // If partially filled (has name OR value but not both)
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

    // Check if both name and value are filled
    if (measurement.name && (measurement.value !== undefined && measurement.value !== null)) {
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

// Define the fields to be extracted from BaseSetupSchema, excluding brain_region_id
const SetupFields = BaseSetupSchema.pick({
    name: true,
    description: true,
});

export const ExperimentalSynapsesPerConnectionSchema = z.object({
  // Spread the setup fields to the top level (name and description)
  ...SetupFields.shape, 
  
  subject_id: z
    .string({ message: 'Subject is required' })
    .uuid()
    .nonempty({ message: 'Subject is required' }),
  license_id: z
    .string({ message: 'License is required' })
    .uuid()
    .nonempty({ message: 'License is required' }),
  brain_region_id: z
    .string({ message: 'Brain region is required' })
    .uuid()
    .nonempty({ message: 'Brain region is required' }),
  pre_mtype_id: z
    .string({ message: 'M-type class is required' })
    .uuid()
    .nonempty({ message: 'M-type class is required' }),
  post_mtype_id: z
    .string({ message: 'M-type class is required' })
    .uuid()
    .nonempty({ message: 'M-type class is required' }),
  pre_region_id: z
    .string({ message: 'M-type region is required' })
    .uuid()
    .nonempty({ message: 'M-type region is required' }),
  post_region_id: z
    .string({ message: 'M-type region is required' })
    .uuid()
    .nonempty({ message: 'M-type region is required' }),
    
  contribution: ContributionArraySchema,
  measurements: MeasurementArraySchema,
});