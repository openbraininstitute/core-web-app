'use client';

import React from 'react';

import { GithubFlavorMarkdown } from '@/components/github-flavor-markdown';
import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import { MINIMAL_PANEL_SIZE, usePanelWidth } from '../hooks';
import { BackupPlotsWrapper, extractStorageIdsFromMessage } from './backup-plots';
import { CollapsibleMessage } from './collapsible-message';
import ToolsProgress from './tools-progress';

import type { ToolInvocation, UIMessage } from '@ai-sdk/ui-utils';

import styles from './message-item.module.css';

interface MessageItemProps {
  className?: string;
  value: UIMessage;
  status?: 'submitted' | 'streaming' | 'ready' | 'error';
  isLastMessage?: boolean;
  index?: number;
}

export const MessageItem = React.memo(RawMessageItem);

function RawMessageItem({
  className,
  value,
  status = 'ready',
  isLastMessage = false,
  index,
}: MessageItemProps) {
  const debug = useDebug();

  if ((value.role === 'user' || value.role === 'assistant') && value.parts.length === 0) {
    return null;
  }

  return (
    <div
      className={classNames(className, styles.messageItem)}
      style={
        index !== undefined
          ? ({ '--index': Math.min(index, 10) } as React.CSSProperties)
          : undefined
      }
    >
      <MessageChild value={value} debug={debug} status={status} isLastMessage={isLastMessage} />
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
}: {
  value: UIMessage;
  debug: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  isLastMessage: boolean;
}): React.ReactNode {
  const { setPanelWidth } = usePanelWidth();
  const deferredParts = React.useDeferredValue(value.parts);
  const memoizedStorageIds = React.useMemo(
    () => extractStorageIdsFromMessage(deferredParts),
    [deferredParts]
  );
  const validStorageIds = useStableArray(memoizedStorageIds);

  switch (value.role) {
    case 'user':
      return (
        <div className={styles.user}>
          <div className={styles.userContent}>
            <div>{value.parts.map((part) => part.type === 'text' && part.text)}</div>
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
          <CollapsibleMessage message={value} status={isLastMessage ? status : 'ready'}>
            {children}
          </CollapsibleMessage>
          <div className={styles.backupPlotsWrapper}>
            <BackupPlotsWrapper message={value} isLastMessage={isLastMessage} status={status} />
          </div>
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
