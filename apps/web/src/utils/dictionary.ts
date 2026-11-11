import isNil from 'es-toolkit/compat/isNil';

/**
 * @returns A clone of `values` without items whose values are null, undefined,
 * empty strings or strings full of spaces.
 */
export function compactRecord<T extends Record<string, any>>(
  values: Record<string, any> | undefined
): NonNullable<T> | NonNullable<Record<string, any>> {
  if (!values) {
    return {};
  }

  const out: Record<string, T> = {};

  for (const [k, v] of Object.entries(values)) {
    if (!isNil(v) && (typeof v !== 'string' || v.trim() !== '')) {
      out[k] = v;
    }
  }

  return out;
}
