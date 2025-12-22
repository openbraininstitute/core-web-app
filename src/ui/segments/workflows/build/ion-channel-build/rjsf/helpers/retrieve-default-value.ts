import { getDefaultFormState, RJSFSchema } from '@rjsf/utils';
import { get } from 'es-toolkit/compat';
import validator from '@rjsf/validator-ajv8';

/**
 * Retrieves default values for a form based on the provided schema and form data.
 * Uses the AJV8 validator to generate default form state.
 *
 * @param {Object} params - The parameters object
 * @param {RJSFSchema} params.schema - The JSON schema definition for the form
 * @param {any} [params.formData={}] - Optional existing form data to merge with defaults
 * @returns {any} The default form state with merged form data
 */
export function retrieveDefaultValues({
  schema,
  formData = {},
}: {
  schema: RJSFSchema;
  formData?: any;
}) {
  return getDefaultFormState(validator, schema, formData);
}

/**
 * Retrieves a single default value from a schema at the specified path.
 * First gets all default values from the schema, then extracts the value at the given path.
 *
 * @param {Object} params - The parameters object
 * @param {RJSFSchema} params.schema - The JSON schema definition to get defaults from
 * @param {string} params.path - The path to the specific value to retrieve from the defaults
 * @returns {any} The default value at the specified path
 */
export function retrieveDefaultValue({ schema, path }: { schema: RJSFSchema; path: string }) {
  const defaults = retrieveDefaultValues({ schema });
  return get(defaults, path);
}
