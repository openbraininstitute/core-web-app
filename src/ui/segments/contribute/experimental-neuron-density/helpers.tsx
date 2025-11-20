import { z } from 'zod';
import { FormInstance } from 'antd';
import isNil from 'es-toolkit/compat/isNil';

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

const measurementSchema = z
  .object({
    name: z
      // Allow null/undefined from an empty Select, then enforce it must be a non-empty string
      .union([z.string(), z.null(), z.undefined()])
      .refine((val) => typeof val === 'string' && val.length > 0, {
        message: 'Measurement name is required',
      })
      .transform((val) => val as string),

    unit: z
      .string({ message: 'Measurement unit is required' })
      .nonempty({ message: 'Measurement unit is required' }),

    value: z
      // Allow number, null, or undefined from an InputNumber
      .union([z.number(), z.null(), z.undefined()])
      .refine((val) => val !== null && val !== undefined, {
        message: 'Measurement value is required',
      })
      .refine((val) => typeof val === 'number' && val >= 0, {
        message: 'Measurement value must be a non-negative number',
      })
      .transform((val) => val as number),
  })
  .passthrough(); // <--- ADD THIS

const SetupSchema = z.object({
  name: z
    .string({ message: 'Experimental cell density name is required' })
    .nonempty({ message: 'Experimental cell density name is required' }),
  description: z
    .string({ message: 'Experimental cell density description is required' })
    .nonempty({ message: 'Experimental cell density description is required' }),
  brain_region_id: z
    .string({ message: 'Brain region is required' })
    .uuid()
    .nonempty({ message: 'Brain region is required' }),
});

export type TContribution = z.infer<typeof ContributionSchema>;
// FIX: Removed the explicit ': ZodTypeAny' type to correctly infer the Zod object schema
export const ExperimentalNeuronDensitySchema = z.object({
  setup: SetupSchema,
  subject_id: z
    .string({ message: 'Subject is required' })
    .uuid()
    .nonempty({ message: 'Subject is required' }),
  license_id: z
    .string({ message: 'License is required' })
    .uuid()
    .nonempty({ message: 'License is required' }),
  mtype_class_id: z.string({ message: 'M-type class is required' }).uuid().optional(),
  etype_class_id: z.string({ message: 'E-type class is required' }).uuid().optional(),

  measurements: z
    .array(measurementSchema)
    .nonempty({ message: 'At least one measurement is required' }),
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

export type TExperimentalNeuronDensityForm = z.infer<typeof ExperimentalNeuronDensitySchema>;

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
