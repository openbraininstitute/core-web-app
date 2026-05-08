import { initial, join, last, split } from 'es-toolkit/compat';
import { z } from 'zod';

import { cn } from '@/utils/css-class';

import type { FormInstance } from 'antd';
import type { ComponentProps, ReactNode } from 'react';
import type { ZodSafeParseResult, ZodType } from 'zod';
import type {
  ICustomFormErrorOptions,
  TStepValidationStatus,
} from '@/ui/segments/contribute/shared/types';

export class CustomFormError extends Error {
  public readonly cause?: unknown;

  public readonly field?: string;

  public readonly code?: string;

  public readonly details?: Record<string, unknown>;

  constructor(message: string, options?: ICustomFormErrorOptions) {
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

  override toString(): string {
    let str = `[${this.name}] ${this.message}`;
    if (this.field) str += ` (field: ${this.field})`;
    if (this.code) str += ` [code: ${this.code}]`;
    return str;
  }
}

export function renderLabel(
  text: string,
  type: 'main' | 'secondary' = 'main',
  extra?: ReactNode,
  cls?: ComponentProps<'span'>['className']
): ReactNode {
  return (
    <span
      className={cn(
        'text-base font-light',
        type === 'main' && 'text-primary-8  font-bold!',
        type === 'secondary' && 'text-label',
        cls
      )}
    >
      {text} {extra}
    </span>
  );
}

/**
 * Returns true when a Zod issue targets this field exactly, or a parent segment
 * (e.g. contribution.0 when the field is contribution.0.agent_type). Root issues
 * with an empty path are not mapped onto nested fields.
 */
function _zodIssueAppliesToFieldPath(
  issuePath: ReadonlyArray<PropertyKey>,
  fieldPath: string
): boolean {
  if (issuePath.length === 0) return false;
  const joined = issuePath.map(String).join('.');
  if (joined === fieldPath) return true;
  return fieldPath.startsWith(`${joined}.`);
}

/**
 * creates a validator function for Ant Design forms that validates using a Zod schema
 * validates the whole form but only returns errors for the specific field
 * @param schema - The Zod schema to validate against
 * @param fieldPath - Dot-notation path to the field (e.g., 'setup.name', 'contribution.0.agent_id')
 * @param form - The Ant Design form instance
 * @param extraCustomValidator - Optional additional validator that can throw CustomFormError
 */
export function createZodFieldValidator<TSchema extends ZodType, TFormValues>(
  schema: TSchema,
  fieldPath: string,
  form: FormInstance<TFormValues>,
  extraCustomValidator?: (values: TFormValues) => void | Promise<void>
) {
  return async (_rule: unknown, _value: unknown): Promise<void> => {
    const values = form.getFieldsValue(true) as TFormValues;
    const result = await schema.safeParseAsync(values);

    if (!result.success) {
      const matchingIssue = result.error.issues.find((issue) => issue.path.join('.') === fieldPath);
      if (matchingIssue) {
        return Promise.reject(matchingIssue.message);
      }
    }

    // run the extra validator when the current field has no zod errors,
    // regardless of whether other fields failed validation.
    try {
      await extraCustomValidator?.(values);
    } catch (error) {
      if (error instanceof CustomFormError) {
        return Promise.reject(error.message);
      }
      throw error;
    }
  };
}

/**
 * determines the validation status of a field based on its validator result and dirty state
 * @param validator - The result of a Zod safeParse operation
 * @param fieldKey - The key of the field being validated
 * @param dirtyFields - Array of field keys that have been touched/modified
 * @returns 'valid' if validation passed, 'invalid' if validation failed and field is dirty, 'non-touched' otherwise
 */
export function getValidationStatus<T>(
  validator: ZodSafeParseResult<T>,
  fieldKey: string,
  dirtyFields: Array<string>
): TStepValidationStatus {
  if (validator.success) return 'valid';
  if (dirtyFields.includes(fieldKey)) return 'invalid';
  return 'non-touched';
}

/**
 * gets dirty fields from an Ant Design form.
 * checks nested fields (e.g. ['setup', 'name']) and returns the top-level key
 * ('setup') as dirty if any of its children have been touched.
 */
export function getDirtyFields(form: FormInstance<any>): Array<string> {
  const allFields = form.getFieldsValue(true) as Record<string, unknown>;
  const antForm = form;

  return Object.keys(allFields).filter((topLevelKey) => {
    if (antForm.isFieldTouched(topLevelKey)) return true;

    const value = allFields[topLevelKey];

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value as Record<string, unknown>).some((nestedKey) =>
        antForm.isFieldTouched([topLevelKey, nestedKey])
      );
    }

    if (Array.isArray(value)) {
      return value.some((item, index) => {
        if (antForm.isFieldTouched([topLevelKey, index])) return true;
        if (item !== null && typeof item === 'object') {
          return Object.keys(item as Record<string, unknown>).some((nestedKey) =>
            antForm.isFieldTouched([topLevelKey, index, nestedKey])
          );
        }
        return false;
      });
    }

    return false;
  });
}

export interface IFileTypeConfig {
  type: string;
  extension: string;
  mimeType: string;
}

export function parseFileName(fileName: string): { name: string; ext: string } {
  const parts = split(fileName, '.');
  return {
    name: join(initial(parts), '.'),
    ext: last(parts) ?? '',
  };
}

/**
 * gets the file extension based on file type config
 */
export function getFileExtension(
  file: File,
  fileTypes: Array<IFileTypeConfig>
): string | undefined {
  const { ext } = parseFileName(file.name);
  const fileType = fileTypes.find((f) => ext === f.type || file.type === f.mimeType);
  return fileType?.extension;
}

/**
 * gets the MIME type based on file extension
 */
export function getMimeType(file: File, fileTypes: Array<IFileTypeConfig>): string | undefined {
  const ext = getFileExtension(file, fileTypes);
  const fileType = fileTypes.find((f) => ext === f.extension);
  return fileType?.mimeType;
}

/**
 * gets the index of the current step
 */
export function getCurrentStepIndex(steps: Array<{ key: string }>, activeStepKey: string): number {
  return steps.findIndex((step) => step.key === activeStepKey);
}

/**
 * gets the previous step key
 */
export function getPreviousStepKey(
  steps: Array<{ key: string }>,
  activeStepKey: string
): string | null {
  const currentIndex = getCurrentStepIndex(steps, activeStepKey);
  if (currentIndex > 0) {
    return steps[currentIndex - 1].key;
  }
  return null;
}

/**
 * gets the next step key
 */
export function getNextStepKey(
  steps: Array<{ key: string }>,
  activeStepKey: string
): string | null {
  const currentIndex = getCurrentStepIndex(steps, activeStepKey);
  if (currentIndex < steps.length - 1) {
    return steps[currentIndex + 1].key;
  }
  return null;
}

export const RequiredFieldMarker = <sup className="text-destructive">*</sup>;
