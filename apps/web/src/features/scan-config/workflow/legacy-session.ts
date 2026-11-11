import { use, useRef } from 'react';

import { createWorkflowSessionId } from './session';

/** Search param for legacy (non scan-config) workflow configure routes. */
export const LEGACY_WORKFLOW_SESSION_SEARCH_PARAM = 'session' as const;

export type TLegacyWorkflowSessionSearchParams = {
  [LEGACY_WORKFLOW_SESSION_SEARCH_PARAM]?: string;
};

/**
 * resolves session id from legacy workflow configure URL search params (`session`)
 * used by legacy build/simulate pages that pass session in the query string
 */
export function resolveLegacyWorkflowSessionFromSearchParams(
  queryParams: Record<string, string | undefined>
): string {
  return queryParams[LEGACY_WORKFLOW_SESSION_SEARCH_PARAM] || createWorkflowSessionId();
}

/**
 * resolves session id from legacy workflow configure URL search params (`session`)
 * if missing, returns a stable `wf_…` id for the component lifetime
 */
export function useLegacyWorkflowSessionFromSearchParams(
  searchParams: Promise<TLegacyWorkflowSessionSearchParams & Record<string, string | undefined>>
): string {
  const refSessionId = useRef<string | null>(null);
  if (!refSessionId.current) {
    refSessionId.current = createWorkflowSessionId();
  }

  const params = use(searchParams);
  const session = params[LEGACY_WORKFLOW_SESSION_SEARCH_PARAM];

  return session ?? refSessionId.current;
}
