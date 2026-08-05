'use client';

import type { Config } from '@/features/scan-config/types';

/**
 * In-memory drafts of the scan-config editor form, so leaving the configure
 * page and coming back to the same workflow session keeps what was typed.
 *
 * The form lives in `useState` below the route boundary, so navigating away
 * unmounts it and drops the draft. Keying by workflow session (plus origin,
 * matching the `key` on ScanConfigContainer) means a fresh browse → configure
 * trip still starts from schema defaults, while returning to the same session
 * restores the edits.
 *
 * Memory-only, like the tab location memory: a full page reload starts over.
 */
const drafts = new Map<string, Config>();

/** Keeps a bounded number of sessions; a workspace visit only touches a few. */
const MAX_DRAFTS = 10;

/**
 * Draft key for a configure route, or undefined outside a workflow session
 * (the editor is also used without one, where there is nothing to key on).
 */
export function buildConfigDraftKey(
  workflowSessionId: string | undefined,
  origin: string | undefined
): string | undefined {
  return workflowSessionId ? `${workflowSessionId}_${origin ?? ''}` : undefined;
}

export function readConfigDraft(key: string): Config | undefined {
  return drafts.get(key);
}

export function writeConfigDraft(key: string, config: Config): void {
  // re-insert so the most recently edited session is the last to be evicted
  drafts.delete(key);
  drafts.set(key, config);

  if (drafts.size > MAX_DRAFTS) {
    const oldest = drafts.keys().next();
    if (!oldest.done) drafts.delete(oldest.value);
  }
}
