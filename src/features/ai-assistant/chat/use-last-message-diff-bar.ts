'use client';

import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import React from 'react';

import {
  activeDiffMessageIdAtom,
  clearDiffStateAtom,
  type DiffBarData,
  diffStateAtom,
  preMessageConfigAtom,
} from '@/state/config-highlights';
import { computeLiveDiffs } from '@/utils/diff';

import {
  completedEditStateParts,
  findLastNewConfig,
  modifiedBlockSet,
  processAccumulatedDiffs,
} from '../message-item/use-message-diffs';

import type { UIMessage } from '@ai-sdk/react';

export interface LastMessageDiffBarState {
  diffBarData: DiffBarData | null;
  clearDiffBarData: () => void;
}

export const diffBarDataAtom = atom<DiffBarData | null>(null);

/**
 * Panel-level hook that manages diff bar population and diff highlight
 * show/hide for the last message. Extracted from useMessageDiffs to keep
 * message-level and panel-level concerns separate.
 *
 * Mount once in the Chat component.
 */
export function useLastMessageDiffBar(
  messages: UIMessage[],
  status: 'submitted' | 'streaming' | 'ready' | 'error'
): LastMessageDiffBarState {
  const [activeDiffMessageId] = useAtom(activeDiffMessageIdAtom);
  const setDiffState = useSetAtom(diffStateAtom);
  const clearDiff = useSetAtom(clearDiffStateAtom);
  const clearDiffState = React.useCallback(() => clearDiff(), [clearDiff]);

  // Local state instead of a global atom — only this hook and chat.tsx use it
  const [diffBarData, setDiffBarData] = useAtom(diffBarDataAtom);
  const clearDiffBarData = React.useCallback(() => setDiffBarData(null), [setDiffBarData]);

  // Config snapshot captured by chat.ts before the first editstate call
  const preMessageConfig = useAtomValue(preMessageConfigAtom);

  const lastMessage = messages[messages.length - 1] as UIMessage | undefined;

  // ── Derived data for the last message ──────────────────────────────────

  const hasCompletedEditStateCalls = React.useMemo(
    () => (lastMessage ? completedEditStateParts(lastMessage.parts).length > 0 : false),
    [lastMessage]
  );

  const lastNewConfig = React.useMemo(
    () => (lastMessage ? findLastNewConfig(lastMessage.parts) : null),
    [lastMessage]
  );

  const accumulatedDiffs = React.useMemo(() => {
    if (!lastNewConfig) return [];
    // When preMessageConfig is null (first editstate call ever, no prior config),
    // treat it as an empty object so diffs show all fields as "add".
    return computeLiveDiffs(
      (preMessageConfig ?? {}) as Record<string, unknown>,
      lastNewConfig as Record<string, unknown>
    );
  }, [preMessageConfig, lastNewConfig]);

  // ── Diff bar population (streaming → ready transition) ─────────────────

  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    const wasStreaming =
      prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted';
    prevStatusRef.current = status;

    if (!lastMessage || !hasCompletedEditStateCalls) return;
    if (status !== 'ready' || !wasStreaming) return;

    setDiffBarData({
      messageId: lastMessage.id,
      accumulatedDiffs,
      oldConfig: preMessageConfig,
    });
  }, [
    hasCompletedEditStateCalls,
    status,
    lastMessage,
    accumulatedDiffs,
    preMessageConfig,
    setDiffBarData,
  ]);

  // ── Show / hide diff highlights ────────────────────────────────────────

  const showDiff = !!(lastMessage && activeDiffMessageId === lastMessage.id);

  React.useEffect(() => {
    if (!showDiff || accumulatedDiffs.length === 0) return;

    const { highlights, strippedDiffs } = processAccumulatedDiffs(accumulatedDiffs);
    setDiffState({
      highlights,
      diffs: strippedDiffs,
      oldConfig: preMessageConfig,
      expandedRootElements: modifiedBlockSet(highlights),
    });
  }, [showDiff, accumulatedDiffs, preMessageConfig, setDiffState]);

  const prevShowDiffRef = React.useRef(showDiff);
  React.useEffect(() => {
    if (prevShowDiffRef.current && !showDiff) {
      clearDiffState();
    }
    prevShowDiffRef.current = showDiff;
  }, [showDiff, clearDiffState]);

  return { diffBarData, clearDiffBarData };
}
