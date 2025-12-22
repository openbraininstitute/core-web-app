import { ErrorSchema } from '@rjsf/utils';
import { isNil, compact } from 'es-toolkit/compat';

export const extractErrorMessages = (errorSchema: ErrorSchema | undefined): Array<string> => {
  if (!errorSchema || typeof errorSchema !== 'object') return [];

  // check if errorSchema is empty object
  if (Object.keys(errorSchema).length === 0) return [];

  const errors: Array<string> = [];

  const traverse = (obj: any, path: string = ''): void => {
    if (!obj || typeof obj !== 'object') return;

    // check for __errors array
    if (Array.isArray(obj.__errors) && obj.__errors.length > 0) {
      obj.__errors.forEach((error: string) => {
        if (error && typeof error === 'string') {
          // format path to be more readable
          const fieldPath = path ? path.replace(/^\./, '').replace(/\./g, ' > ') : '';
          // if we have a path, format as "path: error", otherwise just the error
          errors.push(fieldPath ? `${fieldPath}: ${error}` : error);
        }
      });
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key !== '__errors' && !isNil(obj[key]) && typeof obj[key] === 'object') {
          // handle array indices differently - show them as [index] instead of .index
          const isArrayIndex = !Number.isNaN(Number(key));
          // eslint-disable-next-line no-nested-ternary
          const newPath = path ? (isArrayIndex ? `${path}[${key}]` : `${path}.${key}`) : key;
          traverse(obj[key], newPath);
        }
      }
    }
  };

  traverse(errorSchema);
  return errors.filter(Boolean).filter((e, i, arr) => arr.indexOf(e) === i);
};

/**
 * extracts validation error messages grouped by their top-level parent field.
 * works recursively for any nesting depth.
 */
export function extractParentErrors(errorSchema: ErrorSchema): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  function walk(node: ErrorSchema, parent?: string) {
    if (!node || typeof node !== 'object') return;

    for (const [key, value] of Object.entries(node)) {
      if (key === '__errors' && Array.isArray(value)) {
        if (parent) {
          result[parent] = compact([...(result[parent] ?? []), ...value]);
        }
      } else if (typeof value === 'object') {
        walk(value as ErrorSchema, parent ?? key);
      }
    }
  }

  walk(errorSchema);
  return result;
}
