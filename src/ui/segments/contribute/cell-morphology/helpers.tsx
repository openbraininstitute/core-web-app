import { z } from 'zod';
import { FormInstance } from 'antd';
import initial from 'lodash/initial';
import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';
import split from 'lodash/split';
import isNil from 'lodash/isNil';
import size from 'lodash/size';
import last from 'lodash/last';
import join from 'lodash/join';
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
    .array(
      z.object({
        agent_type: z.enum(
          Object.values(AgentType).map((type) => type.key) as [TAgentType, ...TAgentType[]],
          { message: 'Agent type is required' }
        ),
        agent_id: z
          .string({ message: 'Agent is required' })
          .uuid()
          .nonempty({ message: 'Agent is required' }),
        role_id: z
          .string({ message: 'Role is required' })
          .uuid()
          .nonempty({ message: 'Role is required' }),
      })
    )
    .nonempty({ message: 'At least one contributor is required' }),
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
