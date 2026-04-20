'use client';

import React from 'react';
import { useAtom, useSetAtom } from 'jotai';

import { computeLiveDiffs } from '@/utils/diff';
import {
  diffStateAtom,
  clearDiffStateAtom,
  activeDiffMessageIdAtom,
  diffBarDataAtom,
} from '@/state/config-highlights';
import {
  completedEditStateParts,
  findOldConfig,
  findLastNewConfig,
  processAccumulatedDiffs,
  modifiedBlockSet,
} from '../../message-item/use-message-diffs';

import type { UIMessage } from '@ai-sdk/ui-utils';

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
) {
  const [activeDiffMessageId] = useAtom(activeDiffMessageIdAtom);
  const [, setDiffBarData] = useAtom(diffBarDataAtom);
  const setDiffState = useSetAtom(diffStateAtom);
  const clearDiff = useSetAtom(clearDiffStateAtom);
  const clearDiffState = React.useCallback(() => clearDiff(), [clearDiff]);

  const lastMessage = messages[messages.length - 1] as UIMessage | undefined;

  // ── Derived data for the last message ──────────────────────────────────

  const hasCompletedEditStateCalls = React.useMemo(
    () => (lastMessage ? completedEditStateParts(lastMessage.parts).length > 0 : false),
    [lastMessage?.parts],
  );

  const firstOldConfig = React.useMemo(
    () => (lastMessage ? findOldConfig(lastMessage.parts, messages) : null),
    [lastMessage?.parts, messages],
  );

  const lastNewConfig = React.useMemo(
    () => (lastMessage ? findLastNewConfig(lastMessage.parts) : null),
    [lastMessage?.parts],
  );

  const accumulatedDiffs = React.useMemo(() => {
    if (!firstOldConfig || !lastNewConfig) return [];
    return computeLiveDiffs(
      firstOldConfig as Record<string, unknown>,
      lastNewConfig as Record<string, unknown>,
    );
  }, [firstOldConfig, lastNewConfig]);

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
      oldConfig: firstOldConfig,
    });
  }, [
    hasCompletedEditStateCalls,
    status,
    lastMessage?.id,
    accumulatedDiffs,
    firstOldConfig,
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
      oldConfig: firstOldConfig,
      expandedRootElements: modifiedBlockSet(highlights),
    });
  }, [showDiff, accumulatedDiffs, firstOldConfig, setDiffState]);

  const prevShowDiffRef = React.useRef(showDiff);
  React.useEffect(() => {
    if (prevShowDiffRef.current && !showDiff) {
      clearDiffState();
    }
    prevShowDiffRef.current = showDiff;
  }, [showDiff, clearDiffState]);
}
