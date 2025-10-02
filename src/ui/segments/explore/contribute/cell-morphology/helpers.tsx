import { z } from 'zod';
import { FormInstance } from 'antd';
import initial from 'lodash/initial';
import split from 'lodash/split';
import join from 'lodash/join';
import last from 'lodash/last';
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
  contribution: z.object({
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
  }),
});

export type TCellMorphologyForm = z.infer<typeof CellMorphologySchema>;
/**
 * Validate a single field (even nested) from a Zod schema.
 * It validates the whole object (so superRefine runs),
 * then filters issues for the requested field.
 */
export function zodFieldValidator<T extends ZodTypeAny>(
  schema: T,
  fieldPath: string,
  form: FormInstance
) {
  return async (_: unknown, __: unknown) => {
    try {
      await schema.parseAsync(form.getFieldsValue(true));
      return Promise.resolve();
    } catch (error) {
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
