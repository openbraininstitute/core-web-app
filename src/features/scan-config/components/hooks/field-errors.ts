import { atom, useAtom } from 'jotai';
import { useEffect } from 'react';

/**
 * shared atom holding field-level validation errors from middle-column inputs
 * that ajv schema validation doesn't catch (e.g. min/max limits from mechanism
 * mapping config in ion channel editors, or ParameterSweep range errors).
 * eg: ["neuronal_manipulations/entryName/field/section", error message]
 */
export const fieldErrorsAtom = atom<Map<string, string>>(new Map());

export function useFieldError(fieldPath: string | undefined, error: string | undefined) {
  const [, setFieldErrors] = useAtom(fieldErrorsAtom);

  useEffect(() => {
    if (!fieldPath) return;
    setFieldErrors((prev) => {
      const next = new Map(prev);
      if (error) next.set(fieldPath, error);
      else next.delete(fieldPath);
      return next;
    });
    // drop the entry on unmount so a stale error can't keep the form blocked
    return () => {
      setFieldErrors((prev) => {
        if (!prev.has(fieldPath)) return prev;
        const next = new Map(prev);
        next.delete(fieldPath);
        return next;
      });
    };
  }, [fieldPath, error, setFieldErrors]);
}

/**
 * check if any field errors exist under a given root element path.
 */
export function useFieldErrorsForPath(pathPrefix: string): boolean {
  const [fieldErrors] = useAtom(fieldErrorsAtom);
  for (const key of fieldErrors.keys()) {
    if (key.startsWith(pathPrefix)) return true;
  }
  return false;
}
