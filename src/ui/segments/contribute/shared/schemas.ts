import dayjs from 'dayjs';
import { isEmpty, isNil, pickBy, size } from 'es-toolkit/compat';
import { z } from 'zod';

import { AgentType, type TAgentType } from '@/ui/segments/contribute/shared/types';

export const ContributionSchema = z.object({
  agent_type: z.enum(
    Object.values(AgentType).map((type) => type.key) as [TAgentType, ...Array<TAgentType>],
    {
      error: 'Contributor type is required',
    }
  ),
  agent_id: z.uuid({ error: 'Contributor must be a valid UUID' }),
  role_id: z.uuid({ error: 'Role must be a valid UUID' }),
});

export type TContribution = z.infer<typeof ContributionSchema>;

export const ContributionArraySchema = z
  .tuple([ContributionSchema], ContributionSchema)
  .superRefine((arr, ctx) => {
    let hasFullyFilledContribution = false;

    arr.forEach((contrib, idx) => {
      const filledFields = [contrib.agent_type, contrib.agent_id, contrib.role_id].filter(
        (field) => !isNil(field) && (typeof field !== 'string' || field !== '')
      );

      // if partially filled, mark required fields as invalid
      if (filledFields.length > 0 && filledFields.length < 3) {
        if (isNil(contrib.agent_type)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Contributor type is required',
            path: [idx, 'agent_type'],
          });
        }
        if (isNil(contrib.agent_id) || contrib.agent_id === '') {
          ctx.addIssue({
            code: 'custom',
            message: 'Contributor is required',
            path: [idx, 'agent_id'],
          });
        }
        if (isNil(contrib.role_id) || contrib.role_id === '') {
          ctx.addIssue({
            code: 'custom',
            message: 'Role is required',
            path: [idx, 'role_id'],
          });
        }
      }

      if (filledFields.length === 3) {
        hasFullyFilledContribution = true;
      }
    });

    if (!hasFullyFilledContribution) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one contribution must be fully filled',
        path: [],
      });
    }

    // check for duplicates
    const seen = new Map<string, number>();
    arr.forEach((contrib, idx) => {
      if (contrib.agent_id) {
        if (seen.has(contrib.agent_id)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Duplicate contributor, contributor should be used only once',
            path: [idx, 'agent_id'],
          });
        } else {
          seen.set(contrib.agent_id, idx);
        }
      }
    });
  });

export const LocationSchema = z
  .object({
    x: z.number({ error: 'X coordinate should be a number' }).nullish(),
    y: z.number({ error: 'Y coordinate should be a number' }).nullish(),
    z: z.number({ error: 'Z coordinate should be a number' }).nullish(),
  })
  .nullish()
  .superRefine((val, ctx) => {
    if (!val) {
      return;
    }
    const defined = pickBy(val, (v) => !isNil(v) && !Number.isNaN(v));
    if (isEmpty(defined) || size(defined) === 3) {
      return;
    }
    const allKeys = Object.keys(val);
    const difference = allKeys.filter((key) => !defined[key]);
    for (const key of difference) {
      ctx.addIssue({
        code: 'custom',
        message: 'All coordinates (x, y, z) are required if one is provided',
        path: [key],
      });
    }
  });

export const ExperimentDateSchema = z
  .custom((data) => dayjs.isDayjs(data), {
    error: 'Experiment date should be a valid date',
  })
  .refine(
    (data) => {
      const today = dayjs();
      if (dayjs.isDayjs(data) && (data.isBefore(today, 'day') || data.isSame(today, 'day'))) {
        return true;
      }
      return false;
    },
    {
      error: 'Experiment date should be today or in the past',
    }
  )
  .nullish();

export const BaseSetupSchema = z.object({
  name: z.string({ error: 'Name is required' }).nonempty({ error: 'Name is required' }),
  description: z
    .string({ error: 'Description is required' })
    .nonempty({ error: 'Description is required' }),
  brain_region_id: z.uuid().nonempty({ error: 'Brain region is required' }),
  experiment_date: ExperimentDateSchema,
  contact_email: z.email({ error: 'Contact email should be a valid email' }).nullish(),
  published_in: z.string().nullish(),
  location: LocationSchema,
});

export type TBaseSetup = z.infer<typeof BaseSetupSchema>;

export const SubjectIdSchema = z.uuid().nonempty({
  error: 'Subject is required',
});

export const LicenseIdSchema = z.uuid().nonempty({
  error: 'License is required',
});

export function createFileSchema(
  fileTypes: Array<string>
): z.ZodObject<Record<string, z.ZodType<File>>> {
  const shape: Record<string, z.ZodType<File>> = {};
  fileTypes.forEach((type) => {
    shape[type] = z.instanceof(File);
  });
  return z.object(shape);
}
