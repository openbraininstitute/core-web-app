'use client';

/**
 * Single source of truth for "this scan config can no longer be edited".
 *
 * The form columns already derived this inline, but the right column's 3D
 * preview did not: dragging an electrode array in the viewer wrote straight
 * back into a config the form had frozen (e.g. after generating a campaign and
 * navigating back to the configuration tab).
 *
 * Keeping the rule in one place means the viewer and the form cannot drift.
 */

import { useShowingDiffs } from '@/features/scan-config/hooks/use-showing-diffs';
import { useAIConfig } from '@/services/ai-agent';

interface Options {
  /** Set once a campaign has been generated from this config — the config is then immutable. */
  campaignId?: string;
  /** Generation in flight. */
  loading?: boolean;
  /** Host-level read-only mode (viewing an archived / someone else's config). */
  readOnly?: boolean;
}

interface ResolveOptions extends Options {
  /** An AI-proposed config is on screen; the user accepts or rejects it, not edits it. */
  aiConfig?: unknown;
  /** False while the agent is still streaming a proposal. */
  isChatReady?: boolean;
  /** The diff overlay is showing a previous config revision. */
  showingDiffs?: boolean;
}

/** Pure rule behind {@link useScanConfigEditingLocked}; kept testable without React. */
export function resolveScanConfigEditingLocked({
  campaignId,
  loading,
  readOnly,
  aiConfig,
  isChatReady = true,
  showingDiffs,
}: ResolveOptions): boolean {
  return Boolean(campaignId || loading || readOnly || aiConfig || !isChatReady || showingDiffs);
}

export function useScanConfigEditingLocked(options: Options): boolean {
  const { aiConfig, isChatReady } = useAIConfig();
  const showingDiffs = useShowingDiffs();

  return resolveScanConfigEditingLocked({ ...options, aiConfig, isChatReady, showingDiffs });
}
