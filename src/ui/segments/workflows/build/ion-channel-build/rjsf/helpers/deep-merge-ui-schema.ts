import type { UiSchema } from '@rjsf/utils';

/**
 * recursively merges two UI schema objects, combining their properties.
 * Properties from the source schema override those in the target schema,
 * except for nested objects which are merged recursively.
 *
 * @param target - The base UI schema object to merge into
 * @param source - The UI schema object whose properties will be merged into the target
 * @returns A new merged UI schema object
 *
 * @example
 * const target = {
 *   "field1": { "ui:widget": "text" },
 *   "field2": { "ui:disabled": true }
 * };
 *
 * const source = {
 *   "field1": { "ui:placeholder": "Enter text" },
 *   "field3": { "ui:widget": "select" }
 * };
 *
 * const merged = mergeUiSchemas(target, source);
 * // Result:
 * // {
 * //   "field1": {
 * //     "ui:widget": "text",
 * //     "ui:placeholder": "Enter text"
 * //   },
 * //   "field2": { "ui:disabled": true },
 * //   "field3": { "ui:widget": "select" }
 * // }
 */
export const mergeUiSchemas = (target: UiSchema, source: UiSchema): UiSchema => {
  const result = { ...target };
  // eslint-disable-next-line no-restricted-syntax
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeUiSchemas(
        (target[key] as UiSchema) || {},
        source[key] as UiSchema
      ) as (typeof source)[typeof key];
    } else {
      result[key] = source[key];
    }
  }
  return result;
};
