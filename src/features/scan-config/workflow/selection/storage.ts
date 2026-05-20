'use client';

/**
 * browser sessionStorage adapter for workflow selection payloads
 *
 * safe to call during SSR: read/write/clear no-op when `window` is unavailable
 */

import { workflowSelectionStorageKey } from '@/features/scan-config/workflow/selection/helpers';
import { parseWorkflowSelectionPayload } from '@/features/scan-config/workflow/selection/parse';

import type { TWorkflowSelectionPayload } from '@/features/scan-config/workflow/selection/types';

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage;
}

/**
 * serialize and store a workflow selection under `sessionId`
 *
 * @param storage - override for tests; defaults to `window.sessionStorage`
 */
export function writeWorkflowSelection(
  sessionId: string,
  payload: TWorkflowSelectionPayload,
  storage: Storage | null = getSessionStorage()
): void {
  if (!storage) {
    return;
  }
  storage.setItem(workflowSelectionStorageKey(sessionId), JSON.stringify(payload));
}

/**
 * read and validate a stored workflow selection
 *
 * @returns parsed payload, or `null` when missing, invalid, or storage is unavailable
 */
export function readWorkflowSelection(
  sessionId: string,
  storage: Storage | null = getSessionStorage()
): TWorkflowSelectionPayload | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(workflowSelectionStorageKey(sessionId));
  if (!raw) {
    return null;
  }

  return parseWorkflowSelectionPayload(raw);
}

/** remove a workflow selection entry for `sessionId` */
export function clearWorkflowSelection(
  sessionId: string,
  storage: Storage | null = getSessionStorage()
): void {
  if (!storage) {
    return;
  }
  storage.removeItem(workflowSelectionStorageKey(sessionId));
}
