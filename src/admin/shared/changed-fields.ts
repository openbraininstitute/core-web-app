// These APIs refuse an empty update and write an explicit null, so a form sends only what the
// operator changed. An unset form field and a null column count as the same.
export function changedFields<Update extends Record<string, unknown>>(
  next: Update,
  current: Partial<Record<keyof Update, unknown>>
) {
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => (value ?? null) !== (current[key] ?? null))
  ) as Partial<Update>;
}
