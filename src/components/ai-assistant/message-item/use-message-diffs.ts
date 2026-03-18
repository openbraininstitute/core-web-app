'use client';

import React from 'react';
import { useAtom, useSetAtom } from 'jotai';

import {
  adjustParentTypes,
  computeLiveDiffs,
  type DiffResult,
} from '@/utils/diff';
import { configStateAtom, agentStateAtom } from '@/services/ai-agent/hooks/chat';
import type { Config } from '@/features/scan-config/components/components';
import {
  diffStateAtom,
  clearDiffStateAtom,
  activeDiffMessageIdAtom,
  diffBarDataAtom,
  pendingRestoreConfigAtom,
  restorePreviewActiveAtom,
} from '@/state/config-highlights';

import type { UIMessage, ToolInvocationUIPart } from '@ai-sdk/ui-utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Filter parts down to completed editstate tool invocations. */
function completedEditStateParts(parts: UIMessage['parts']): ToolInvocationUIPart[] {
  return parts.filter(
    (p) =>
      p.type === 'tool-invocation' &&
      p.toolInvocation.toolName === 'editstate' &&
      p.toolInvocation.state === 'result'
  ) as ToolInvocationUIPart[];
}

/** Strip the leading `smc_simulation_config` segment when present. */
function stripConfigPrefix(path: string[]): string[] {
  return path[0] === 'smc_simulation_config' && path.length > 1 ? path.slice(1) : path;
}

/** Build highlight objects from diffs (with path prefix stripped). */
function diffsToHighlights(diffs: DiffResult[]) {
  return diffs.map((d) => ({ path: stripConfigPrefix(d.path), type: d.type }));
}

/** Build adjusted diffs with path prefix stripped. */
function diffsWithStrippedPaths(diffs: DiffResult[]): DiffResult[] {
  return diffs.map((d) => ({ ...d, path: stripConfigPrefix(d.path) }));
}

/** Collect the set of top-level block names touched by highlights. */
function modifiedBlockSet(highlights: { path: string[] }[]): Set<string> {
  return new Set(highlights.map((h) => h.path[0]).filter((b): b is string => b !== undefined));
}

/** Reset all diff-related atoms to their idle state. */
function useClearDiffState() {
  const clearDiff = useSetAtom(clearDiffStateAtom);
  return React.useCallback(() => clearDiff(), [clearDiff]);
}

// ── Main hook ────────────────────────────────────────────────────────────────

interface UseMessageDiffsArgs {
  message: UIMessage;
  allMessages: UIMessage[];
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  isLastMessage: boolean;
}

export interface MessageDiffActions {
  hasEditStateCalls: boolean;
  handlePreviewRestore: () => void;
  handleConfirmRestore: () => void;
  handleCancelRestore: () => void;
}

export function useMessageDiffs({
  message,
  allMessages,
  status,
  isLastMessage,
}: UseMessageDiffsArgs): MessageDiffActions {
  const [, setConfig] = useAtom(configStateAtom);
  const [agentState] = useAtom(agentStateAtom);
  const setDiffState = useSetAtom(diffStateAtom);
  const [activeDiffMessageId] = useAtom(activeDiffMessageIdAtom);
  const [, setDiffBarData] = useAtom(diffBarDataAtom);
  const [, setPendingRestoreConfig] = useAtom(pendingRestoreConfigAtom);
  const [, setRestorePreviewActive] = useAtom(restorePreviewActiveAtom);

  const clearDiffState = useClearDiffState();

  const showDiff = activeDiffMessageId === message.id;

  // ── Derived data ─────────────────────────────────────────────────────────

  const hasEditStateCalls = React.useMemo(
    () => message.parts.some((p) => p.type === 'tool-invocation' && p.toolInvocation.toolName === 'editstate'),
    [message.parts]
  );

  const hasCompletedEditStateCalls = React.useMemo(
    () => completedEditStateParts(message.parts).length > 0,
    [message.parts]
  );

  /** The config state captured *before* the first editstate call in this message. */
  const firstOldConfig = React.useMemo(() => {
    if (!isLastMessage) return null;

    const calls = completedEditStateParts(message.parts);
    if (calls.length === 0) return null;

    // Collect all editstate invocations from this message so we can skip them
    const thisMessageEditStates = new Set(calls.map((c) => c.toolInvocation));

    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (!msg.parts) continue;

      for (let j = msg.parts.length - 1; j >= 0; j--) {
        const part = msg.parts[j];
        if (part.type !== 'tool-invocation') continue;

        const inv = part.toolInvocation;
        // Skip all editstate calls from the current message
        if (thisMessageEditStates.has(inv)) continue;

        if (
          (inv.toolName === 'editstate' || inv.toolName === 'getstate') &&
          inv.state === 'result'
        ) {
          try {
            const result = JSON.parse(inv.result as string);
            return result?.state?.smc_simulation_config || null;
          } catch {
            continue;
          }
        }
      }
    }
    return null;
  }, [isLastMessage, message.parts, allMessages]);

  /** The config from the *last* completed editstate call in this message. */
  const lastNewConfig = React.useMemo((): Record<string, unknown> | null => {
    const calls = completedEditStateParts(message.parts).reverse();
    if (calls.length === 0) return null;

    try {
      const last = calls[0];
      if (last.toolInvocation.state === 'result') {
        const result = JSON.parse(last.toolInvocation.result as string);
        return result?.state?.smc_simulation_config || null;
      }
    } catch (error) {
      console.error('Failed to get latest state:', error);
    }
    return null;
  }, [message.parts]);

  /** True diff between old and new config via fast-json-patch compare. */
  const accumulatedDiffs = React.useMemo(() => {
    if (!isLastMessage || !firstOldConfig || !lastNewConfig) return [];
    return computeLiveDiffs(
      firstOldConfig as Record<string, unknown>,
      lastNewConfig as Record<string, unknown>
    );
  }, [isLastMessage, firstOldConfig, lastNewConfig]);

  /** Extract the config from the *last* completed editstate call (for restore). */
  const getLatestState = React.useCallback((): Config | null => {
    return (lastNewConfig as Config) ?? null;
  }, [lastNewConfig]);

  // ── Diff bar population (streaming → ready transition) ───────────────────

  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    const wasStreaming =
      prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted';
    prevStatusRef.current = status;

    if (!isLastMessage || !hasCompletedEditStateCalls) return;
    if (status !== 'ready' || !wasStreaming) return;

    setDiffBarData({
      messageId: message.id,
      accumulatedDiffs,
      oldConfig: firstOldConfig,
    });
  }, [
    isLastMessage,
    hasCompletedEditStateCalls,
    status,
    message.id,
    accumulatedDiffs,
    firstOldConfig,
    setDiffBarData,
  ]);

  // ── Show / hide diff highlights ──────────────────────────────────────────

  React.useEffect(() => {
    if (!showDiff || accumulatedDiffs.length === 0) return;

    const highlights = diffsToHighlights(accumulatedDiffs);
    setDiffState({
      highlights,
      diffs: diffsWithStrippedPaths(accumulatedDiffs),
      oldConfig: firstOldConfig,
      expandedRootElements: modifiedBlockSet(highlights),
    });
  }, [
    showDiff,
    accumulatedDiffs,
    firstOldConfig,
    setDiffState,
  ]);

  const prevShowDiffRef = React.useRef(showDiff);
  React.useEffect(() => {
    if (prevShowDiffRef.current && !showDiff) {
      clearDiffState();
    }
    prevShowDiffRef.current = showDiff;
  }, [showDiff, message.id, clearDiffState]);

  // ── Restore actions ──────────────────────────────────────────────────────

  const preRestoreConfigRef = React.useRef<Config | null>(null);

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

    preRestoreConfigRef.current = currentLiveConfig as Config | null;

    // Set the preview guard BEFORE setting configStateAtom so the aiConfig
    // auto-apply effect in left.tsx skips this update.
    setRestorePreviewActive(true);
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
    setConfig,
    setDiffState,
  ]);

  const handleConfirmRestore = React.useCallback(() => {
    const latestState = getLatestState();
    if (latestState) {
      setConfig(null);
      setRestorePreviewActive(false);
      setPendingRestoreConfig(latestState as Record<string, any>);
    }
    preRestoreConfigRef.current = null;
    clearDiffState();
  }, [getLatestState, setConfig, setRestorePreviewActive, setPendingRestoreConfig, clearDiffState]);

  const handleCancelRestore = React.useCallback(() => {
    preRestoreConfigRef.current = null;
    setConfig(null);
    setRestorePreviewActive(false);
    clearDiffState();
  }, [setConfig, setRestorePreviewActive, clearDiffState]);

  return {
    hasEditStateCalls,
    handlePreviewRestore,
    handleConfirmRestore,
    handleCancelRestore,
  };
}
