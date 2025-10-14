import { z } from 'zod';
import { FormInstance } from 'antd';
import initial from 'es-toolkit/compat/initial';
import isEmpty from 'es-toolkit/compat/isEmpty';
import pickBy from 'es-toolkit/compat/pickBy';
import split from 'es-toolkit/compat/split';
import isNil from 'es-toolkit/compat/isNil';
import size from 'es-toolkit/compat/size';
import last from 'es-toolkit/compat/last';
import join from 'es-toolkit/compat/join';
import dayjs from 'dayjs';

import type { SafeParseReturnType, ZodTypeAny } from 'zod';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/utils/css-class';

export const label = (
  text: string,
  type: 'main' | 'secondary' = 'main',
  extra?: ReactNode,
  cls?: ComponentProps<'span'>['className']
) => (
  <span
    className={cn(
      'text-base font-light',
      type === 'main' && 'text-primary-8 !font-bold',
      type === 'secondary' && 'text-label',
      cls
    )}
  >
    {text} {extra}
  </span>
);

export const AgentType = {
  Person: {
    key: 'person',
    label: 'Person',
  },
  Organization: {
    key: 'organization',
    label: 'Organization',
  },
  Consortium: {
    key: 'consortium',
    label: 'Consortium',
  },
} as const;

export type TAgentType = (typeof AgentType)[keyof typeof AgentType]['key'];

export const ContributionSchema = z.object({
  agent_type: z
    .enum(Object.values(AgentType).map((type) => type.key) as [TAgentType, ...TAgentType[]], {
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
export const CellMorphologySchema = z.object({
  setup: z.object({
    name: z
      .string({ message: 'Cell morphology name is required' })
      .nonempty({ message: 'Cell morphology name is required' }),
    description: z
      .string({ message: 'Cell morphology description is required' })
      .nonempty({ message: 'Cell morphology description is required' }),
    brain_region_id: z
      .string({ message: 'Brain region is required' })
      .uuid()
      .nonempty({ message: 'Brain region is required' }),
    experiment_date: z
      .custom((data) => dayjs.isDayjs(data), { message: 'Experiment date should be a valid date' })
      .refine(
        (data) => {
          const today = dayjs();
          if (dayjs.isDayjs(data) && (data.isBefore(today, 'day') || data.isSame(today, 'day'))) {
            return true;
          }
          return false;
        },
        {
          message: 'Experiment date should be today or in the past',
        }
      )
      .nullish(),
    contact_email: z.string().email({ message: 'Contact email should be a valid email' }).nullish(),
    published_in: z.string().nullish(),
    location: z
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
            message: `All coordinates (x, y, z) are required if one is provided`,
            path: difference,
          };
        }
      ),
  }),
  // subject: SubjectCreateSchema,
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
  assets: z.object({
    swc: z.instanceof(File),
    asc: z.instanceof(File),
    h5: z.instanceof(File),
  }),
  contribution: z
    .array(ContributionSchema)
    .nonempty({ message: 'At least one contributor is required' })
    .superRefine((arr, ctx) => {
      // check that at least one contribution is fully filled
      let hasFullyFilledContribution = false;
      arr.forEach((contrib, idx) => {
        const filledFields = [contrib.agent_type, contrib.agent_id, contrib.role_id].filter(
          (field) => !isNil(field) && (typeof field !== 'string' || field !== '')
        );

        // if partially filled (some fields but not all), it's invalid
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

        // if fully filled, mark that we have at least one valid contribution
        if (filledFields.length === 3) {
          hasFullyFilledContribution = true;
        }
      });

      // check that we have at least one fully filled contribution
      if (!hasFullyFilledContribution) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one contribution must be fully filled',
          path: [],
        });
      }

      // check for duplicate contributors (only among filled entries)
      const seen = new Map<string, number>();
      arr.forEach((contrib, idx) => {
        if (contrib.agent_id) {
          if (seen.has(contrib.agent_id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate contributor, contributor should be used only once`,
              path: [idx, 'agent_id'],
            });
          } else {
            seen.set(contrib.agent_id, idx);
          }
        }
      });
    }),
});

export type TCellMorphologyForm = z.infer<typeof CellMorphologySchema>;

export interface CustomFormErrorOptions {
  cause?: unknown; // underlying error (if any)
  field?: string; // form field related to the error
  code?: string; // machine-readable error code
  details?: Record<string, any>; // any extra info for debugging/logging
}

export class CustomFormError extends Error {
  public readonly cause?: unknown;

  public readonly field?: string;

  public readonly code?: string;

  public readonly details?: Record<string, any>;

  constructor(message: string, options?: CustomFormErrorOptions) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = 'CustomFormError';
    this.cause = options?.cause;
    this.field = options?.field;
    this.code = options?.code;
    this.details = options?.details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toString(): string {
    let str = `[${this.name}] ${this.message}`;
    if (this.field) str += ` (field: ${this.field})`;
    if (this.code) str += ` [code: ${this.code}]`;
    return str;
  }
}

/**
 * Validate a single field (even nested) from a Zod schema.
 * It validates the whole object (so superRefine runs),
 * then filters issues for the requested field.
 * @param schema - The Zod schema to validate against
 * @param fieldPath - The path to the field to validate
 * @param form - The form instance
 * @param extraCustomValidator - An extra custom validator to run this should throw a custom error CustomFormError
 * @returns A validator function
 */
export function zodFieldValidator<T extends ZodTypeAny, R>(
  schema: T,
  fieldPath: string,
  form: FormInstance,
  extraCustomValidator?: (values: R) => void
) {
  return async (_: unknown, __: unknown) => {
    try {
      const values = form.getFieldsValue(true) as R;
      await Promise.all([schema.parseAsync(values), extraCustomValidator?.(values)]);
      return Promise.resolve();
    } catch (error) {
      if (error instanceof CustomFormError) {
        return Promise.reject(error.message);
      }
      if (error instanceof z.ZodError) {
        const errors = error.issues;
        const error1 = errors.find((err) => err.path.join('.') === fieldPath);
        if (error1) {
          return Promise.reject(error1.message);
        }
      }
    }
  };
}

/**
 * Determines the validation status of a field based on its validator result and dirty state
 * @param validator - The result of a Zod safeParse operation
 * @param fieldKey - The key of the field being validated
 * @param dirtyFields - Array of field keys that have been touched/modified
 * @returns 'valid' if validation passed, 'invalid' if validation failed and field is dirty, 'non-touched' otherwise
 */
export function getValidationStatus<T = any>(
  validator: SafeParseReturnType<T, T>,
  fieldKey: string,
  dirtyFields: Array<string>
): 'valid' | 'invalid' | 'non-touched' {
  // eslint-disable-next-line no-nested-ternary
  return validator.success
    ? 'valid'
    : !validator.success && dirtyFields.includes(fieldKey)
      ? 'invalid'
      : 'non-touched';
}
// add js docs for getContributionValidationStatus
/**
 * Determines the validation status of a contribution field based on its validator result and dirty state
 * If the contribution array has more than one item and all the items have the same numeric index, then the validation is valid
 * Or the validation is valid if the contribution array has only one item
 * @param validator - The result of a Zod safeParse operation
 * @param fieldKey - The key of the field being validated
 * @param dirtyFields - Array of field keys that have been touched/modified
 * @param contribution - The contribution array being validated
 * @returns 'valid' if validation passed, 'invalid' if validation failed and field is dirty, 'non-touched' otherwise
 *
 */
export function getContributionValidationStatus<T = any>(
  validator: SafeParseReturnType<T, T>,
  fieldKey: string,
  dirtyFields: Array<string>
): 'valid' | 'invalid' | 'non-touched' {
  // eslint-disable-next-line no-nested-ternary
  return validator.success
    ? 'valid'
    : !validator.success && dirtyFields.includes(fieldKey)
      ? 'invalid'
      : 'non-touched';
}

export const FILE_TYPES = [
  { type: 'swc', extension: 'swc', mimeType: 'application/swc' },
  { type: 'asc', extension: 'asc', mimeType: 'application/asc' },
  { type: 'h5', extension: 'h5', mimeType: 'application/x-hdf5' },
];

export function getOriginalFileName(fileName: string) {
  const { name, ext } = ((p) => ({ name: join(initial(p), '.'), ext: last(p) }))(
    split(fileName, '.')
  );
  return { name, ext };
}

export function getFileExtensionByTypeOrMimeType(file: File) {
  const { ext } = getOriginalFileName(file.name);
  const fileType = FILE_TYPES.find((f) => ext === f.type || file.type === f.mimeType);
  return fileType?.extension;
}

export function getMimeTypeByExtension(file: File) {
  const ext = getFileExtensionByTypeOrMimeType(file);
  const fileType = FILE_TYPES.find((f) => ext === f.extension);
  return fileType?.mimeType;
}
