'use client';

import { useAtom, useSetAtom } from 'jotai';
import React from 'react';

import { agentStateAtom, configStateAtom } from '@/services/ai-agent/hooks/chat';
import {
  clearDiffStateAtom,
  diffStateAtom,
  pendingRestoreConfigAtom,
  restorePreviewActiveAtom,
  restorePreviewMessageIdAtom,
} from '@/state/config-highlights';
import { adjustParentTypes, computeLiveDiffs, type DiffResult } from '@/utils/diff';

import type { UIMessage } from '@ai-sdk/react';
import { isToolUIPart, getToolName, type ToolUIPart, type DynamicToolUIPart } from 'ai';
import type { Config } from '@/features/scan-config/components/components';

// ── Helpers (exported for reuse by panel-level hook) ─────────────────────────

/** Filter parts down to completed editstate tool invocations. */
export function completedEditStateParts(parts: UIMessage['parts']): (ToolUIPart | DynamicToolUIPart)[] {
  return parts.filter(
    (p) =>
      isToolUIPart(p) &&
      getToolName(p) === 'editstate' &&
      p.state === 'output-available'
  ) as (ToolUIPart | DynamicToolUIPart)[];
}

/** Strip the leading `smc_simulation_config` segment when present. */
export function stripConfigPrefix(path: string[]): string[] {
  return path[0] === 'smc_simulation_config' && path.length > 1 ? path.slice(1) : path;
}

/** Strip config prefix from diffs and derive highlights in a single pass. */
export function processAccumulatedDiffs(diffs: DiffResult[]): {
  highlights: { path: string[]; type: DiffResult['type'] }[];
  strippedDiffs: DiffResult[];
} {
  const highlights: { path: string[]; type: DiffResult['type'] }[] = [];
  const strippedDiffs: DiffResult[] = [];
  for (const d of diffs) {
    const path = stripConfigPrefix(d.path);
    highlights.push({ path, type: d.type });
    strippedDiffs.push({ ...d, path });
  }
  return { highlights, strippedDiffs };
}

/** Collect the set of top-level block names touched by highlights. */
export function modifiedBlockSet(highlights: { path: string[] }[]): Set<string> {
  return new Set(highlights.map((h) => h.path[0]).filter((b): b is string => b !== undefined));
}

/** Reset all diff-related atoms to their idle state. */
function useClearDiffState() {
  const clearDiff = useSetAtom(clearDiffStateAtom);
  return React.useCallback(() => clearDiff(), [clearDiff]);
}

/**
 * Extract the config from the last completed editstate call in a message.
 * Exported for reuse by panel-level hook.
 */
export function findLastNewConfig(
  messageParts: UIMessage['parts']
): Record<string, unknown> | null {
  const calls = completedEditStateParts(messageParts).reverse();
  if (calls.length === 0) return null;

  try {
    const last = calls[0];
    if (last.state === 'output-available') {
      const result = last.output as Record<string, any>;
      return result?.state?.smc_simulation_config || null;
    }
  } catch (error) {
    console.error('Failed to get latest state:', error);
  }
  return null;
}

// ── Main hook (message-level concerns only) ──────────────────────────────────

interface UseMessageDiffsArgs {
  message: UIMessage;
}

export interface MessageDiffActions {
  hasEditStateCalls: boolean;
  handlePreviewRestore: () => void;
  handleConfirmRestore: () => void;
  handleCancelRestore: () => void;
}

export function useMessageDiffs({ message }: UseMessageDiffsArgs): MessageDiffActions {
  const [, setConfig] = useAtom(configStateAtom);
  const [agentState] = useAtom(agentStateAtom);
  const setDiffState = useSetAtom(diffStateAtom);
  const [, setPendingRestoreConfig] = useAtom(pendingRestoreConfigAtom);
  const [, setRestorePreviewActive] = useAtom(restorePreviewActiveAtom);
  const [, setRestorePreviewMessageId] = useAtom(restorePreviewMessageIdAtom);

  const clearDiffState = useClearDiffState();

  // ── Derived data ─────────────────────────────────────────────────────────

  const hasEditStateCalls = React.useMemo(
    () =>
      message.parts.some(
        (p) => isToolUIPart(p) && getToolName(p) === 'editstate'
      ),
    [message.parts]
  );

  /** The config from the *last* completed editstate call in this message. */
  const lastNewConfig = React.useMemo(() => findLastNewConfig(message.parts), [message.parts]);

  /** Extract the config from the *last* completed editstate call (for restore). */
  const getLatestState = React.useCallback((): Config | null => {
    return (lastNewConfig as Config) ?? null;
  }, [lastNewConfig]);

  // ── Restore actions ──────────────────────────────────────────────────────

  const handlePreviewRestore = React.useCallback(() => {
    const latestState = getLatestState();
    if (!latestState) return;

    const currentLiveConfig =
      (agentState as Record<string, unknown>)?.smc_simulation_config ?? null;

    let liveDiffs: DiffResult[] = [];
    if (currentLiveConfig && typeof currentLiveConfig === 'object') {
      liveDiffs = computeLiveDiffs(
        currentLiveConfig as Record<string, unknown>,
        latestState as Record<string, unknown>
      );
    }

    if (liveDiffs.length === 0) return;

    const adjustedDiffs = adjustParentTypes(liveDiffs);

    setRestorePreviewActive(true);
    setRestorePreviewMessageId(message.id);
    setConfig(latestState as Config);

    const highlights = adjustedDiffs.map((d) => ({ path: d.path, type: d.type }));
    setDiffState({
      highlights,
      diffs: adjustedDiffs,
      oldConfig: currentLiveConfig as Record<string, any>,
      expandedRootElements: modifiedBlockSet(highlights),
    });
  }, [
    getLatestState,
    agentState,
    setRestorePreviewActive,
    setRestorePreviewMessageId,
    message.id,
    setConfig,
    setDiffState,
  ]);

  const handleConfirmRestore = React.useCallback(() => {
    const latestState = getLatestState();
    if (latestState) {
      setConfig(null);
      setRestorePreviewActive(false);
      setRestorePreviewMessageId(null);
      setPendingRestoreConfig(latestState as Record<string, any>);
    }
    clearDiffState();
  }, [
    getLatestState,
    setConfig,
    setRestorePreviewActive,
    setRestorePreviewMessageId,
    setPendingRestoreConfig,
    clearDiffState,
  ]);

  const handleCancelRestore = React.useCallback(() => {
    setConfig(null);
    setRestorePreviewActive(false);
    setRestorePreviewMessageId(null);
    clearDiffState();
  }, [setConfig, setRestorePreviewActive, setRestorePreviewMessageId, clearDiffState]);

  return {
    hasEditStateCalls,
    handlePreviewRestore,
    handleConfirmRestore,
    handleCancelRestore,
  };
}
