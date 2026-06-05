import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';

import { useScanConfigWorkflowEditorField } from '@/features/scan-config/bridge/editor-context';
import { makeSessionAtomWithDefault } from '@/ui/hooks/use-session-atom';

export const fieldErrorsAtomFamily = makeSessionAtomWithDefault<Map<string, string>>(new Map());

/** shared fallback key for non-workflow scan-config usage (no session in route) */
const NO_SESSION_KEY = '__no_session__';

/** workflow session id that scopes field errors; shared fallback outside workflow pages */
function useFieldErrorsSessionKey(): string {
  return useScanConfigWorkflowEditorField()?.workflowSessionId ?? NO_SESSION_KEY;
}

/** session-scoped field errors map (read-only) */
export function useFieldErrors(): Map<string, string> {
  const sessionKey = useFieldErrorsSessionKey();
  return useAtomValue(fieldErrorsAtomFamily(sessionKey));
}

export function useFieldError(fieldPath: string | undefined, error: string | undefined) {
  const sessionKey = useFieldErrorsSessionKey();
  const [, setFieldErrors] = useAtom(fieldErrorsAtomFamily(sessionKey));

  useEffect(() => {
    if (!fieldPath) return;
    setFieldErrors((prev) => {
      const next = new Map(prev);
      if (error) next.set(fieldPath, error);
      else next.delete(fieldPath);
      return next;
    });
  }, [fieldPath, error, setFieldErrors]);
}

/**
 * check if any field errors exist under a given root element path.
 */
export function useFieldErrorsForPath(pathPrefix: string): boolean {
  const fieldErrors = useFieldErrors();
  for (const key of fieldErrors.keys()) {
    if (key.startsWith(pathPrefix)) return true;
  }
  return false;
}
