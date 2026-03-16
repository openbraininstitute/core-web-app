'use client';

import React from 'react';
import { useAtom } from 'jotai';

import { GithubFlavorMarkdown } from '@/components/github-flavor-markdown';
import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';
import { parseJSONPatches, mergeDiffs, adjustParentTypes, computeLiveDiffs, type JSONPatchOperation, type DiffResult } from '@/utils/diff';
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

import { MINIMAL_PANEL_SIZE, usePanelWidth } from '../hooks';
import { BackupPlotsWrapper, extractStorageIdsFromMessage } from './backup-plots';
import { CollapsibleMessage } from './collapsible-message';
import ToolsProgress from './tools-progress';

import type { ToolInvocation, UIMessage, ToolInvocationUIPart } from '@ai-sdk/ui-utils';

import styles from './message-item.module.css';

interface MessageItemProps {
  className?: string;
  value: UIMessage;
  status?: 'submitted' | 'streaming' | 'ready' | 'error';
  isLastMessage?: boolean;
  allMessages?: UIMessage[];
}

export const MessageItem = React.memo(RawMessageItem);

function RawMessageItem({
  className,
  value,
  status = 'ready',
  isLastMessage = false,
  allMessages = [],
}: MessageItemProps) {
  const debug = useDebug();
  return (
    <div className={classNames(className, styles.messageItem)}>
      <MessageChild value={value} debug={debug} status={status} isLastMessage={isLastMessage} allMessages={allMessages} />
    </div>
  );
}

function useStableArray<T>(arr: T[]): T[] {
  const ref = React.useRef<T[]>(arr);

  if (ref.current.length !== arr.length || ref.current.some((val, idx) => val !== arr[idx])) {
    ref.current = arr;
  }

  return ref.current;
}

function MessageChild({
  value,
  debug,
  status,
  isLastMessage,
  allMessages,
}: {
  value: UIMessage;
  debug: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  isLastMessage: boolean;
  allMessages: UIMessage[];
}): React.ReactNode {
  const { setPanelWidth } = usePanelWidth();
  const deferredParts = React.useDeferredValue(value.parts);
  const memoizedStorageIds = React.useMemo(
    () => extractStorageIdsFromMessage(deferredParts),
    [deferredParts]
  );
  const validStorageIds = useStableArray(memoizedStorageIds);

  // State management for accumulated diffs
  const [, setConfig] = useAtom(configStateAtom);
  const [agentState] = useAtom(agentStateAtom);
  const [, setConfigHighlights] = useAtom(configHighlightsAtom);
  const [, setConfigDiffs] = useAtom(configDiffsAtom);
  const [, setExpandedRootElements] = useAtom(expandedRootElementsAtom);
  const [, setOldConfig] = useAtom(oldConfigAtom);
  const [activeDiffMessageId] = useAtom(activeDiffMessageIdAtom);
  const [, setDiffBarData] = useAtom(diffBarDataAtom);
  
  // Check if this message has the diff view active
  const showDiff = activeDiffMessageId === value.id;

  // Accumulate diffs from all editstate calls in this message
  const accumulatedDiffs = React.useMemo(() => {
    const editStateCalls = value.parts.filter(
      (part) =>
        part.type === 'tool-invocation' &&
        part.toolInvocation.toolName === 'editstate' &&
        part.toolInvocation.state === 'result'
    ) as ToolInvocationUIPart[];

    if (editStateCalls.length === 0) return [];

    let allDiffs: DiffResult[] = [];

    for (const call of editStateCalls) {
      try {
        const args = call.toolInvocation.args as { patches?: JSONPatchOperation[] };
        const patches = args?.patches;

        if (patches && Array.isArray(patches)) {
          const newDiffs = parseJSONPatches(patches);
          allDiffs = mergeDiffs(allDiffs, newDiffs);
        }
      } catch (error) {
        console.error('Failed to parse editstate call:', error);
      }
    }
    
    // Adjust parent types based on children
    // If a parent is 'add', all its descendants should also be 'add'
    return adjustParentTypes(allDiffs);
  }, [value.parts]);

  // Get the first old config state (before any edits)
  const firstOldConfig = React.useMemo(() => {
    const editStateCalls = value.parts.filter(
      (part) =>
        part.type === 'tool-invocation' &&
        part.toolInvocation.toolName === 'editstate' &&
        part.toolInvocation.state === 'result'
    ) as ToolInvocationUIPart[];

    if (editStateCalls.length === 0) return null;

    // Find the previous state before the first editstate call
    const firstCall = editStateCalls[0];
    
    // Look through all messages to find the state before this call
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const message = allMessages[i];
      if (!message.parts) continue;

      for (let j = message.parts.length - 1; j >= 0; j--) {
        const part = message.parts[j];
        if (part.type !== 'tool-invocation') continue;
        
        const toolInvocation = part.toolInvocation;
        
        // Stop when we reach the first editstate call
        if (toolInvocation === firstCall.toolInvocation) {
          return null; // We've reached the first call, no previous state found
        }

        // Look for getstate or editstate results
        if (
          (toolInvocation.toolName === 'editstate' || toolInvocation.toolName === 'getstate') &&
          toolInvocation.state === 'result'
        ) {
          try {
            const result = JSON.parse(toolInvocation.result as string);
            return result?.state?.smc_simulation_config || null;
          } catch (error) {
            continue;
          }
        }
      }
    }

    return null;
  }, [value.parts, allMessages]);

  // Check if this message has editstate calls
  const hasEditStateCalls = React.useMemo(() => {
    return value.parts.some(
      (part) =>
        part.type === 'tool-invocation' &&
        part.toolInvocation.toolName === 'editstate'
    );
  }, [value.parts]);

  // Check if this message has COMPLETED editstate calls
  const hasCompletedEditStateCalls = React.useMemo(() => {
    return value.parts.some(
      (part) =>
        part.type === 'tool-invocation' &&
        part.toolInvocation.toolName === 'editstate' &&
        part.toolInvocation.state === 'result'
    );
  }, [value.parts]);

  // Populate the diff bar data when the last message with editstate calls becomes ready
  // Only on a real streaming→ready transition, not when loading old conversations
  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted';
    prevStatusRef.current = status;

    if (!isLastMessage || !hasCompletedEditStateCalls) return;
    if (status !== 'ready' || !wasStreaming) return;

    setDiffBarData({
      messageId: value.id,
      accumulatedDiffs: accumulatedDiffs,
      oldConfig: firstOldConfig,
    });
  }, [isLastMessage, hasCompletedEditStateCalls, status, value.id, accumulatedDiffs, firstOldConfig, setDiffBarData]);

  // Get the latest state from the last editstate call
  const getLatestState = React.useCallback((): Config | null => {
    const editStateCalls = value.parts
      .filter(
        (part) =>
          part.type === 'tool-invocation' &&
          part.toolInvocation.toolName === 'editstate' &&
          part.toolInvocation.state === 'result'
      )
      .reverse() as ToolInvocationUIPart[];

    if (editStateCalls.length === 0) return null;

    try {
      const lastCall = editStateCalls[0];
      if (lastCall.toolInvocation.state === 'result') {
        const result = JSON.parse(lastCall.toolInvocation.result as string);
        return result?.state?.smc_simulation_config || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get latest state:', error);
      return null;
    }
  }, [value.parts]);

  // Ref to store the config before preview, so cancel can revert
  const preRestoreConfigRef = React.useRef<Config | null>(null);

  // Preview restore: temporarily apply the target state so additions are visible,
  // and show diffs between current and target on the config panel
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

    // Save current config so we can revert on cancel
    preRestoreConfigRef.current = currentLiveConfig as Config | null;

    // Store current config as "old" for field-level comparisons
    if (currentLiveConfig) {
      setOldConfig(currentLiveConfig as Record<string, any>);
    }

    // Temporarily apply the target state so the panel renders additions
    setConfig(latestState as Config);

    const highlights = adjustedDiffs.map((diff) => ({
      path: diff.path,
      type: diff.type,
    }));
    setConfigHighlights(highlights);
    setConfigDiffs(adjustedDiffs);

    const modifiedBlocks = new Set(
      highlights.map((h) => h.path[0]).filter((b): b is string => b !== undefined)
    );
    setExpandedRootElements(modifiedBlocks);
  }, [
    getLatestState,
    agentState,
    setOldConfig,
    setConfig,
    setConfigHighlights,
    setConfigDiffs,
    setExpandedRootElements,
  ]);

  // Confirm restore: keep the already-applied state and flash
  const handleConfirmRestore = React.useCallback(() => {
    const savedConfig = preRestoreConfigRef.current;
    preRestoreConfigRef.current = null;

    // Clear diff highlights
    setConfigHighlights([]);
    setConfigDiffs([]);
    setOldConfig(null);
    setExpandedRootElements(new Set(['info']));

    // Flash the changes if there was a previous config to diff against
    if (savedConfig) {
      const latestState = getLatestState();
      if (latestState) {
        const liveDiffs = computeLiveDiffs(
          savedConfig as Record<string, unknown>,
          latestState as Record<string, unknown>
        );
        if (liveDiffs.length > 0) {
          const adjustedDiffs = adjustParentTypes(liveDiffs);
          const patches = adjustedDiffs.map((diff) => ({
            op: diff.type,
            path: '/' + diff.path.join('/'),
            value: diff.value,
          }));
          window.dispatchEvent(
            new CustomEvent('config-updated', { detail: { patches } })
          );
        }
      }
    }
  }, [
    getLatestState,
    setConfigHighlights,
    setConfigDiffs,
    setOldConfig,
    setExpandedRootElements,
  ]);

  // Cancel restore: revert to the saved config and clear highlights
  const handleCancelRestore = React.useCallback(() => {
    if (preRestoreConfigRef.current) {
      setConfig(preRestoreConfigRef.current);
      preRestoreConfigRef.current = null;
    }
    setConfigHighlights([]);
    setConfigDiffs([]);
    setOldConfig(null);
    setExpandedRootElements(new Set(['info']));
  }, [setConfig, setConfigHighlights, setConfigDiffs, setOldConfig, setExpandedRootElements]);

  // Handler for view diffs - now triggered by the diff bar via activeDiffMessageIdAtom
  // The diff bar sets activeDiffMessageIdAtom, and this effect reacts to showDiff changes
  // to apply or clear the diff highlights.

  // Apply/update diffs when showDiff is on
  React.useEffect(() => {
    if (!showDiff || accumulatedDiffs.length === 0) return;

    // Set old config for field-level comparisons
    setOldConfig(firstOldConfig);

    // Update highlights with the latest accumulated diffs
    const highlights = accumulatedDiffs.map((diff) => {
      const adjustedPath =
        diff.path[0] === 'smc_simulation_config' && diff.path.length > 1
          ? diff.path.slice(1)
          : diff.path;

      return {
        path: adjustedPath,
        type: diff.type,
      };
    });

    setConfigHighlights(highlights);

    const adjustedDiffs = accumulatedDiffs.map((diff) => ({
      ...diff,
      path:
        diff.path[0] === 'smc_simulation_config' && diff.path.length > 1
          ? diff.path.slice(1)
          : diff.path,
    }));
    setConfigDiffs(adjustedDiffs);

    // Update expanded blocks
    const modifiedBlocks = new Set(
      highlights.map((h) => h.path[0]).filter((b): b is string => b !== undefined)
    );
    setExpandedRootElements(modifiedBlocks);
  }, [showDiff, accumulatedDiffs, firstOldConfig, setOldConfig, setConfigHighlights, setConfigDiffs, setExpandedRootElements]);

  // Clear highlights when showDiff is turned off (only if this message was showing diffs)
  const prevShowDiffRef = React.useRef(showDiff);
  React.useEffect(() => {
    // Only clear if this message was showing diffs and now isn't
    if (prevShowDiffRef.current && !showDiff) {
      setConfigHighlights([]);
      setConfigDiffs([]);
      setOldConfig(null);
      setExpandedRootElements(new Set(['info']));
    }
    prevShowDiffRef.current = showDiff;
  }, [showDiff, value.id, setConfigHighlights, setConfigDiffs, setOldConfig, setExpandedRootElements]);

  switch (value.role) {
    case 'user':
      return (
        <div className={styles.user}>
          <div className={styles.userContent}>
            <div>{value.parts.map((part) => part.type === 'text' && part.text)}</div>
          </div>
          <div className={styles.info}>
            <div className={styles.timestamp}>{value.createdAt && formatDate(value.createdAt)}</div>
          </div>
        </div>
      );
    case 'assistant': {
      const children = deferredParts.map((part, index) => {
        if (part.type === 'text' && part.text !== '') {
          return (
            <GithubFlavorMarkdown
              // eslint-disable-next-line react/no-array-index-key
              key={`text-${index}`}
              className={styles.markdown}
              onLinkClicked={(external) => {
                if (!external) setPanelWidth(MINIMAL_PANEL_SIZE);
              }}
              validStorageIds={validStorageIds}
              isStreaming={isLastMessage && status === 'streaming'}
            >
              {part.text}
            </GithubFlavorMarkdown>
          );
        }
        if (part.type === 'tool-invocation') {
          const { toolCallId } = part.toolInvocation;
          return (
            <div key={`tool-${toolCallId}`}>
              <ToolsProgress part={part} />
            </div>
          );
        }
        return null;
      });

      return (
        <div className={styles.assistant}>
          <CollapsibleMessage
            message={value}
            status={isLastMessage ? status : 'ready'}
            onPreviewRestore={handlePreviewRestore}
            onConfirmRestore={handleConfirmRestore}
            onCancelRestore={handleCancelRestore}
            hasEditStateCalls={hasEditStateCalls}
          >
            {children}
          </CollapsibleMessage>
          <BackupPlotsWrapper message={value} isLastMessage={isLastMessage} status={status} />
          {debug && (
            <button
              type="button"
              className={styles.debugButton}
              onClick={() => {
                debugToConsole(value);
              }}
            >
              Debug...
            </button>
          )}
        </div>
      );
    }
    default:
      return <pre>{JSON.stringify(value, null, '  ')}</pre>;
  }
}

function debugToConsole(value: UIMessage) {
  // eslint-disable-next-line no-console
  console.log(value);
  for (const part of value.parts) {
    if (part.type !== 'tool-invocation') continue;

    const toolInvocation = part.toolInvocation as ToolInvocation & { result: string };
    // eslint-disable-next-line no-console
    console.debug(`%c${toolInvocation.toolName}`, 'font-weight: bolder; font-size: 110%');
    const { result } = toolInvocation;
    try {
      // eslint-disable-next-line no-console
      console.debug(JSON.parse(result));
    } catch (_ex) {
      // eslint-disable-next-line no-console
      console.error('Not a valid JSON:', result);
    }
  }
}

function useDebug(): boolean {
  const [debug, setDebug] = React.useState(false);
  React.useEffect(() => setDebug(window.localStorage.getItem('DEBUG') === '1'), []);
  return debug;
}

function formatDate(d: Date | string): string {
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const date = isString(d) ? new Date(d) : d;
    return formatter.format(date);
  } catch {
    return '';
  }
}
