import isNil from 'es-toolkit/compat/isNil';

export function compactRecord<T>(
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
