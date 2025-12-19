import type { FormInstance } from 'antd';
import { initial, join, last, split } from 'es-toolkit/compat';
import type { ComponentProps, ReactNode } from 'react';
import type { SafeParseReturnType, ZodTypeAny } from 'zod';
import { z } from 'zod';
import type {
  ICustomFormErrorOptions,
  TStepValidationStatus,
} from '@/ui/segments/contribute/shared/types';
import { cn } from '@/utils/css-class';

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
  cls?: ComponentProps<'span'>['className'],
): ReactNode {
  return (
    <span
      className={cn(
        'text-base font-light',
        type === 'main' && 'text-primary-8 !font-bold',
        type === 'secondary' && 'text-label',
        cls,
      )}
    >
      {text} {extra}
    </span>
  );
}

/**
 * creates a validator function for Ant Design forms that validates using a Zod schema
 * validates the whole form but only returns errors for the specific field
 * @param schema - The Zod schema to validate against
 * @param fieldPath - Dot-notation path to the field (e.g., 'setup.name', 'contribution.0.agent_id')
 * @param form - The Ant Design form instance
 * @param extraCustomValidator - Optional additional validator that can throw CustomFormError
 */
export function createZodFieldValidator<TSchema extends ZodTypeAny, TFormValues>(
  schema: TSchema,
  fieldPath: string,
  form: FormInstance<TFormValues>,
  extraCustomValidator?: (values: TFormValues) => void | Promise<void>,
) {
  return async (_rule: unknown, _value: unknown): Promise<void> => {
    try {
      const values = form.getFieldsValue(true) as TFormValues;
      await Promise.all([schema.parseAsync(values), extraCustomValidator?.(values)]);
    } catch (error) {
      if (error instanceof CustomFormError) {
        return Promise.reject(error.message);
      }
      if (error instanceof z.ZodError) {
        const matchingIssue = error.issues.find((issue) => issue.path.join('.') === fieldPath);
        if (matchingIssue) {
          return Promise.reject(matchingIssue.message);
        }
      }
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
  validator: SafeParseReturnType<T, T>,
  fieldKey: string,
  dirtyFields: string[],
): TStepValidationStatus {
  if (validator.success) return 'valid';
  if (dirtyFields.includes(fieldKey)) return 'invalid';
  return 'non-touched';
}

/**
 * gets dirty fields from an Ant Design form
 */
export function getDirtyFields<TFormValues>(form: FormInstance<TFormValues>): string[] {
  const allFields = form.getFieldsValue(true) as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Object.keys(allFields).filter((field) => (form as any).isFieldTouched(field));
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
export function getFileExtension(file: File, fileTypes: IFileTypeConfig[]): string | undefined {
  const { ext } = parseFileName(file.name);
  const fileType = fileTypes.find((f) => ext === f.type || file.type === f.mimeType);
  return fileType?.extension;
}

/**
 * gets the MIME type based on file extension
 */
export function getMimeType(file: File, fileTypes: IFileTypeConfig[]): string | undefined {
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
  activeStepKey: string,
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
  activeStepKey: string,
): string | null {
  const currentIndex = getCurrentStepIndex(steps, activeStepKey);
  if (currentIndex < steps.length - 1) {
    return steps[currentIndex + 1].key;
  }
  return null;
}

export const RequiredFieldMarker = <sup className="text-destructive">*</sup>;
