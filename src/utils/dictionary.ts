export function compactRecord<T>(
  values: Record<string, any> | undefined
): NonNullable<T> | NonNullable<Record<string, any>> {
  if (!values) {
    return {};
  }

  const out: Record<string, T> = {};

  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== 'undefined' && v !== null) {
      out[k] = v;
    }
  }

  return out;
}
