'use client';

import React from 'react';
import { useAtom } from 'jotai';

import {
  parseJSONPatches,
  mergeDiffs,
  adjustParentTypes,
  computeLiveDiffs,
  type JSONPatchOperation,
  type DiffResult,
} from '@/utils/diff';
import { configStateAtom, agentStateAtom } from '@/services/ai-agent/hooks/chat';
import type { Config } from '@/features/scan-config/components/components';
import {
  configHighlightsAtom,
  configDiffsAtom,
  expandedRootElementsAtom,
  oldConfigAtom,
  activeDiffMessageIdAtom,
  diffBarDataAtom,
} from '@/state/config-highlights';

import type { UIMessage, ToolInvocationUIPart } from '@ai-sdk/ui-utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_EXPANDED = new Set(['info']);

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
  const [, setConfigHighlights] = useAtom(configHighlightsAtom);
  const [, setConfigDiffs] = useAtom(configDiffsAtom);
  const [, setOldConfig] = useAtom(oldConfigAtom);
  const [, setExpandedRootElements] = useAtom(expandedRootElementsAtom);

  return React.useCallback(() => {
    setConfigHighlights([]);
    setConfigDiffs([]);
    setOldConfig(null);
    setExpandedRootElements(DEFAULT_EXPANDED);
  }, [setConfigHighlights, setConfigDiffs, setOldConfig, setExpandedRootElements]);
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
  const [, setConfigHighlights] = useAtom(configHighlightsAtom);
  const [, setConfigDiffs] = useAtom(configDiffsAtom);
  const [, setExpandedRootElements] = useAtom(expandedRootElementsAtom);
  const [, setOldConfig] = useAtom(oldConfigAtom);
  const [activeDiffMessageId] = useAtom(activeDiffMessageIdAtom);
  const [, setDiffBarData] = useAtom(diffBarDataAtom);

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

  /** Accumulated & parent-adjusted diffs across all editstate calls in this message. */
  const accumulatedDiffs = React.useMemo(() => {
    const calls = completedEditStateParts(message.parts);
    if (calls.length === 0) return [];

    let all: DiffResult[] = [];
    for (const call of calls) {
      try {
        const patches = (call.toolInvocation.args as { patches?: JSONPatchOperation[] })?.patches;
        if (patches && Array.isArray(patches)) {
          all = mergeDiffs(all, parseJSONPatches(patches));
        }
      } catch (error) {
        console.error('Failed to parse editstate call:', error);
      }
    }
    return adjustParentTypes(all);
  }, [message.parts]);

  /** The config state captured *before* the first editstate call in this message. */
  const firstOldConfig = React.useMemo(() => {
    const calls = completedEditStateParts(message.parts);
    if (calls.length === 0) return null;

    const firstInvocation = calls[0].toolInvocation;

    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (!msg.parts) continue;

      for (let j = msg.parts.length - 1; j >= 0; j--) {
        const part = msg.parts[j];
        if (part.type !== 'tool-invocation') continue;

        const inv = part.toolInvocation;
        if (inv === firstInvocation) return null;

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
  }, [message.parts, allMessages]);

  /** Extract the config from the *last* completed editstate call. */
  const getLatestState = React.useCallback((): Config | null => {
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

    setOldConfig(firstOldConfig);

    const highlights = diffsToHighlights(accumulatedDiffs);
    setConfigHighlights(highlights);
    setConfigDiffs(diffsWithStrippedPaths(accumulatedDiffs));
    setExpandedRootElements(modifiedBlockSet(highlights));
  }, [
    showDiff,
    accumulatedDiffs,
    firstOldConfig,
    setOldConfig,
    setConfigHighlights,
    setConfigDiffs,
    setExpandedRootElements,
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

    if (currentLiveConfig) {
      setOldConfig(currentLiveConfig as Record<string, any>);
    }

    setConfig(latestState as Config);

    const highlights = adjustedDiffs.map((d) => ({ path: d.path, type: d.type }));
    setConfigHighlights(highlights);
    setConfigDiffs(adjustedDiffs);
    setExpandedRootElements(modifiedBlockSet(highlights));
  }, [
    getLatestState,
    agentState,
    setOldConfig,
    setConfig,
    setConfigHighlights,
    setConfigDiffs,
    setExpandedRootElements,
  ]);

  const handleConfirmRestore = React.useCallback(() => {
    preRestoreConfigRef.current = null;
    clearDiffState();
  }, [clearDiffState]);

  const handleCancelRestore = React.useCallback(() => {
    if (preRestoreConfigRef.current) {
      setConfig(preRestoreConfigRef.current);
      preRestoreConfigRef.current = null;
    }
    clearDiffState();
  }, [setConfig, clearDiffState]);

  return {
    hasEditStateCalls,
    handlePreviewRestore,
    handleConfirmRestore,
    handleCancelRestore,
  };
}
