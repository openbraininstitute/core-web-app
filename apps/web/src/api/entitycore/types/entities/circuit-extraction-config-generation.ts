import { z } from 'zod';

import type { IActivity, IActivityFilter } from '@/api/entitycore/types/shared/activity';

export interface ICircuitExtractionConfigGeneration extends IActivity {}

export interface ICircuitExtractionConfigGenerationFilter extends IActivityFilter {}

const CreateCircuitExtractionConfigGenerationSchema = z.object({
  start_time: z.iso.datetime().optional().nullable(),
  end_time: z.iso.datetime().optional().nullable(),
  used_ids: z.array(z.uuid()).prefault([]),
  generated_ids: z.array(z.uuid()).prefault([]),
  authorized_public: z.boolean().prefault(false),
});

export type TCreateCircuitExtractionConfigGeneration = z.infer<
  typeof CreateCircuitExtractionConfigGenerationSchema
>;

const UpdateCircuitExtractionConfigGenerationSchema = z.object({
  start_time: z.iso.datetime().optional().nullable(),
  end_time: z.iso.datetime().optional().nullable(),
  generated_ids: z.array(z.uuid()).optional().nullable(),
});

export type TUpdateCircuitExtractionConfigGeneration = z.infer<
  typeof UpdateCircuitExtractionConfigGenerationSchema
>;
