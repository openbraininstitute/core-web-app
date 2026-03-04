import z from 'zod';

import { IdentitySchema, TimestampsSchema } from './base';

export const MeasurementStatisticEnum = z.enum([
  'mean',
  'median',
  'mode',
  'variance',
  'data_point',
  'sample_size',
  'standard_error',
  'standard_deviation',
  'raw',
  'minimum',
  'maximum',
  'sum',
]);

export const MeasurementUnitEnum = z.enum([
  'dimensionless',
  '1/μm',
  '1/μm²',
  '1/mm³',
  'μm',
  'μm²',
  'μm³',
  'radian',
]);

export const StructuralDomainEnum = z.enum([
  'apical_dendrite',
  'basal_dendrite',
  'axon',
  'soma',
  'neuron_morphology',
  'not_applicable',
]);

export const MeasurableEntityTypeSchema = z.string();

export const MeasurementItemSchema = z.object({
  name: MeasurementStatisticEnum.nullable(),
  unit: MeasurementUnitEnum.nullable(),
  value: z.number().nullable(),
});

export const MeasurementKindSchema = z.object({
  structural_domain: StructuralDomainEnum,
  measurement_items: z.array(MeasurementItemSchema),
  pref_label: z.string(),
});

export const MeasurementAnnotationSchema = IdentitySchema.merge(TimestampsSchema).extend({
  entity_id: z.string().uuid(),
  entity_type: MeasurableEntityTypeSchema,
  measurement_kinds: z.array(MeasurementKindSchema),
});
