import { z } from 'zod';
import type { IActivityFilter } from '@/api/entitycore/types/shared/activity';
import type {
  ActivityType,
  EntityAuthorization,
  EntityCoreIdentifiable,
  Timestamps,
} from '@/api/entitycore/types/shared/global';

interface NestedEntityRead extends EntityCoreIdentifiable {
  type: string | null;
}

interface ICircuitExtractionConfigGenerationBase {
  start_time: string | null;
  end_time: string | null;
  used: Array<NestedEntityRead>;
  generated: Array<NestedEntityRead>;
}

export interface ICircuitExtractionConfigGeneration
  extends EntityCoreIdentifiable,
    ICircuitExtractionConfigGenerationBase,
    Timestamps,
    EntityAuthorization,
    ActivityType {}

export interface ICircuitExtractionConfigGenerationFilter extends IActivityFilter {}

const CreateCircuitExtractionConfigGenerationSchema = z.object({
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  used_ids: z.array(z.string().uuid()).default([]),
  generated_ids: z.array(z.string().uuid()).default([]),
  authorized_public: z.boolean().default(false),
});

export type TCreateCircuitExtractionConfigGeneration = z.infer<
  typeof CreateCircuitExtractionConfigGenerationSchema
>;

const UpdateCircuitExtractionConfigGenerationSchema = z.object({
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  generated_ids: z.array(z.string().uuid()).optional().nullable(),
});

export type TUpdateCircuitExtractionConfigGeneration = z.infer<
  typeof UpdateCircuitExtractionConfigGenerationSchema
>;
