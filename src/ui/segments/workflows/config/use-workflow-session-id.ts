'use client';

import { use, useRef } from 'react';

import { createWorkflowSessionId } from '@/features/scan-config/workflow/session';

import { WORKFLOW_SESSION_ID_SEARCH_PARAM } from './types';

export type WorkflowSessionSearchParams = {
  [WORKFLOW_SESSION_ID_SEARCH_PARAM]?: string;
};

/**
 * Resolves workflow session id from URL search params (`session`).
 * If missing, returns a stable `wf_…` id for the component lifetime.
 */
export function useWorkflowSessionId(
  searchParams: Promise<WorkflowSessionSearchParams & Record<string, string | undefined>>
): string {
  const refSessionId = useRef<string | null>(null);
  if (!refSessionId.current) {
    refSessionId.current = createWorkflowSessionId();
  }

  const params = use(searchParams);
  const session = params[WORKFLOW_SESSION_ID_SEARCH_PARAM];

  return session ?? refSessionId.current;
}
