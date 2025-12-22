import { ErrorSchema, RJSFSchema, toErrorSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';

import { log } from '@/utils/logger';

export function isFormValid({ schema, data }: { schema: RJSFSchema; data: any }) {
  const validationResult = validator.validateFormData(data, schema);
  return validationResult.errors.length <= 0;
}

export function rjsfValidateForm({
  schema,
  data,
  callback,
}: {
  schema: RJSFSchema;
  data: any;
  callback: (data: any, errorSchema: ErrorSchema) => void;
}) {
  if (schema) {
    let errorSchema: ErrorSchema = {} as ErrorSchema;
    try {
      const validationResult = validator.validateFormData(data, schema);

      if (validationResult.errors && validationResult.errors.length > 0) {
        errorSchema = toErrorSchema(validationResult.errors);
      }
    } catch (error) {
      log('error', '[RjsfValidateForm] validation error:', error);
    }

    callback(data, errorSchema);
  }
}
