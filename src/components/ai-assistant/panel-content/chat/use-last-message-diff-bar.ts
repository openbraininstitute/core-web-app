'use client';

import React from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { computeLiveDiffs } from '@/utils/diff';
import {
  diffStateAtom,
  clearDiffStateAtom,
  activeDiffMessageIdAtom,
  preMessageConfigAtom,
  type DiffBarData,
} from '@/state/config-highlights';
import {
  completedEditStateParts,
  findLastNewConfig,
  processAccumulatedDiffs,
  modifiedBlockSet,
} from '../../message-item/use-message-diffs';

import type { UIMessage } from '@ai-sdk/ui-utils';

export interface LastMessageDiffBarState {
  diffBarData: DiffBarData | null;
  clearDiffBarData: () => void;
}

/**
 * Panel-level hook that manages diff bar population and diff highlight
 * show/hide for the last message. Extracted from useMessageDiffs to keep
 * message-level and panel-level concerns separate.
 *
 * Mount once in the Chat component.
 */
export function useLastMessageDiffBar(
  messages: UIMessage[],
  status: 'submitted' | 'streaming' | 'ready' | 'error',
): LastMessageDiffBarState {
  const [activeDiffMessageId] = useAtom(activeDiffMessageIdAtom);
  const setDiffState = useSetAtom(diffStateAtom);
  const clearDiff = useSetAtom(clearDiffStateAtom);
  const clearDiffState = React.useCallback(() => clearDiff(), [clearDiff]);

  // Local state instead of a global atom — only this hook and chat.tsx use it
  const [diffBarData, setDiffBarData] = React.useState<DiffBarData | null>(null);
  const clearDiffBarData = React.useCallback(() => setDiffBarData(null), []);

  // Config snapshot captured by chat.ts before the first editstate call
  const preMessageConfig = useAtomValue(preMessageConfigAtom);

  const lastMessage = messages[messages.length - 1] as UIMessage | undefined;

  // ── Derived data for the last message ──────────────────────────────────

  const hasCompletedEditStateCalls = React.useMemo(
    () => (lastMessage ? completedEditStateParts(lastMessage.parts).length > 0 : false),
    [lastMessage?.parts],
  );

  const lastNewConfig = React.useMemo(
    () => (lastMessage ? findLastNewConfig(lastMessage.parts) : null),
    [lastMessage?.parts],
  );

  const accumulatedDiffs = React.useMemo(() => {
    if (!preMessageConfig || !lastNewConfig) return [];
    return computeLiveDiffs(
      preMessageConfig as Record<string, unknown>,
      lastNewConfig as Record<string, unknown>,
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
    lastMessage?.id,
    accumulatedDiffs,
    preMessageConfig,
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
