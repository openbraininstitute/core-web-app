import { z } from 'zod';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import type { IActivity, IActivityFilter } from '@/api/entitycore/types/shared/activity';

export interface IIonChannelModelingConfigGeneration extends IActivity {}

export interface IIonChannelModelingConfigGenerationFilter extends IActivityFilter {}

const CreateIonChannelModelingConfigGenerationSchema = z.object({
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  status: z.nativeEnum(ActivityStatus).default(ActivityStatus.DONE),
  used_ids: z.array(z.string().uuid()).default([]),
  generated_ids: z.array(z.string().uuid()).default([]),
  authorized_public: z.boolean().default(false),
});

export type TCreateIonChannelModelingConfigGeneration = z.infer<
  typeof CreateIonChannelModelingConfigGenerationSchema
>;

const UpdateIonChannelModelingConfigGenerationSchema = z.object({
  start_time: z.string().datetime().optional().nullable(),
  end_time: z.string().datetime().optional().nullable(),
  generated_ids: z.array(z.string().uuid()).optional().nullable(),
  status: z.nativeEnum(ActivityStatus).optional().nullable(),
});

export type TUpdateIonChannelModelingConfigGeneration = z.infer<
  typeof UpdateIonChannelModelingConfigGenerationSchema
>;
