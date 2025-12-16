import { isEmpty, isNil, pickBy, size } from 'es-toolkit/compat';
import { z } from 'zod';
import dayjs from 'dayjs';

import { AgentType, type TAgentType } from '@/ui/segments/contribute/shared/types';

export const DEFAULT_LICENSE_ID = 'ad8686db-3cdd-4e3f-bcbd-812380a9eba7';
export const DEFAULT_LICENSE_NAME = 'CC BY 4.0';

export const ContributionSchema = z.object({
  agent_type: z
    .enum(Object.values(AgentType).map((type) => type.key) as [TAgentType, ...Array<TAgentType>], {
      message: 'Contributor type is required',
    })
    .optional(),
  agent_id: z
    .string({ message: 'Contributor is required' })
    .uuid({ message: 'Contributor must be a valid UUID' })
    .optional(),
  role_id: z
    .string({ message: 'Role is required' })
    .uuid({ message: 'Role must be a valid UUID' })
    .optional(),
});

export type TContribution = z.infer<typeof ContributionSchema>;

export const ContributionArraySchema = z
  .array(ContributionSchema)
  .nonempty({ message: 'At least one contributor is required' })
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
            code: z.ZodIssueCode.custom,
            message: 'Contributor type is required',
            path: [idx, 'agent_type'],
          });
        }
        if (isNil(contrib.agent_id) || contrib.agent_id === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Contributor is required',
            path: [idx, 'agent_id'],
          });
        }
        if (isNil(contrib.role_id) || contrib.role_id === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
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
        code: z.ZodIssueCode.custom,
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
            code: z.ZodIssueCode.custom,
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
    x: z.number({ message: 'X coordinate should be a number' }).nullish(),
    y: z.number({ message: 'Y coordinate should be a number' }).nullish(),
    z: z.number({ message: 'Z coordinate should be a number' }).nullish(),
  })
  .nullable()
  .refine(
    (val) => {
      if (!val) return true;
      const defined = pickBy(val, (v) => !isNil(v) && !Number.isNaN(v));
      return isEmpty(defined) || size(defined) === 3;
    },
    (val) => {
      if (!val) return { message: '', path: [] };
      const defined = pickBy(val, (v) => !isNil(v) && !Number.isNaN(v));
      const allKeys = Object.keys(val);
      const difference = allKeys.filter((key) => !defined[key]);
      return {
        message: 'All coordinates (x, y, z) are required if one is provided',
        path: difference,
      };
    }
  );

export const ExperimentDateSchema = z
  .custom((data) => dayjs.isDayjs(data), {
    message: 'Experiment date should be a valid date',
  })
  .refine(
    (data) => {
      const today = dayjs();
      if (dayjs.isDayjs(data) && (data.isBefore(today, 'day') || data.isSame(today, 'day'))) {
        return true;
      }
      return false;
    },
    { message: 'Experiment date should be today or in the past' }
  )
  .nullish();

export const BaseSetupSchema = z.object({
  name: z.string({ message: 'Name is required' }).nonempty({ message: 'Name is required' }),
  description: z
    .string({ message: 'Description is required' })
    .nonempty({ message: 'Description is required' }),
  brain_region_id: z
    .string({ message: 'Brain region is required' })
    .uuid()
    .nonempty({ message: 'Brain region is required' }),
  experiment_date: ExperimentDateSchema,
  contact_email: z.string().email({ message: 'Contact email should be a valid email' }).nullish(),
  published_in: z.string().nullish(),
  location: LocationSchema,
});

export type TBaseSetup = z.infer<typeof BaseSetupSchema>;

export const SubjectIdSchema = z
  .string({ message: 'Subject is required' })
  .uuid()
  .nonempty({ message: 'Subject is required' });

export const LicenseIdSchema = z
  .string({ message: 'License is required' })
  .uuid()
  .nonempty({ message: 'License is required' });

export function createFileSchema(
  fileTypes: Array<string>
): z.ZodObject<Record<string, z.ZodType<File>>> {
  const shape: Record<string, z.ZodType<File>> = {};
  fileTypes.forEach((type) => {
    shape[type] = z.instanceof(File);
  });
  return z.object(shape);
}
