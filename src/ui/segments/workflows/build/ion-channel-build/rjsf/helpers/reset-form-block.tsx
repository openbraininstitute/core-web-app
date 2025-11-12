import { getDefaultFormState } from '@rjsf/utils';
import { cloneDeep, get, set } from 'es-toolkit/compat';
import type { RJSFSchema, ValidatorType } from '@rjsf/utils';

/**
 * Resets a specific section of the form to its schema default.
 *
 * @param params - Options for resetting a part of the form.
 * @param params.validator - The validator instance (usually from @rjsf/validator-ajv8)
 * @param params.schema - The full JSON Schema
 * @param params.formData - The current form data
 * @param params.path - JSON path (dot-separated or array) to reset (e.g., "info.campaign_name" or ["info", "campaign_name"])
 * @returns New formData object with that section reset
 */
export function resetFormSection({
  validator,
  schema,
  formData,
  path,
}: {
  validator: ValidatorType;
  schema: RJSFSchema;
  formData: any;
  path: string | string[];
}) {
  const pathArr = Array.isArray(path) ? path : path.split('.');
  const defaults = getDefaultFormState(validator, schema);
  const newFormData = cloneDeep(formData);

  set(newFormData, pathArr, get(defaults, pathArr));

  return newFormData;
}
