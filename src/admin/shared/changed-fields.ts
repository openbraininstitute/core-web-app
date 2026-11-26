// The billing APIs refuse an empty update and write an explicit null, so a form sends only what
// the operator changed. An unset or emptied form field and a null column count as the same.
const unset = (value: unknown) => (value === '' || value === undefined ? null : value);

export function changedFields<Update extends Record<string, unknown>>(
  next: Update,
  current: Partial<Record<keyof Update, unknown>>
) {
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => unset(value) !== unset(current[key]))
  ) as Partial<Update>;
}

export function saveChanges<Update extends Record<string, unknown>>(
  next: Update,
  current: Partial<Record<keyof Update, unknown>>,
  save: (update: Partial<Update>) => void,
  close: () => void
) {
  const update = changedFields(next, current);
  if (Object.keys(update).length) save(update);
  else close();
}
