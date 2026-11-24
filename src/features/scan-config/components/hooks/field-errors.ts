import { useScanConfigWorkflowEditorField } from '@/features/scan-config/bridge/editor-context';

/** shared fallback key for non-workflow scan-config usage (no session in route) */
const NO_SESSION_KEY = '__no_session__';

/** workflow session id that scopes per-session form state; shared fallback outside workflow pages */
export function useFieldErrorsSessionKey(): string {
  return useScanConfigWorkflowEditorField()?.workflowSessionId ?? NO_SESSION_KEY;
}
