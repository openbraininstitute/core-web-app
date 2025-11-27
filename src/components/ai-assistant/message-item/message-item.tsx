'use client';

import React from 'react';
import { ToolInvocation, UIMessage } from '@ai-sdk/ui-utils';

import { MINIMAL_PANEL_SIZE, usePanelWidth } from '../hooks';
import ToolsProgress from './tools-progress';
import ToolsComponents from './tools-components';

import { classNames } from '@/util/utils';
import { GithubFlavorMarkdown } from '@/components/github-flavor-markdown';
import { isString } from '@/util/type-guards';

import styles from './message-item.module.css';

interface MessageItemProps {
  className?: string;
  value: UIMessage;
  hideTools: boolean;
}

export const MessageItem = React.memo(RawMessageItem);

function RawMessageItem({ className, value }: MessageItemProps) {
  const debug = useDebug();
  return (
    <div className={classNames(className, styles.messageItem)}>
      <MessageChild value={value} debug={debug} />
    </div>
  );
}

function MessageChild({ value, debug }: { value: UIMessage; debug: boolean }): React.ReactNode {
  const { setPanelWidth } = usePanelWidth();
  const deferredParts = React.useDeferredValue(value.parts);
  const isContentPending = value.parts !== deferredParts;

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
      return (
        <div
          className={styles.assistant}
          style={{ opacity: isContentPending ? 0.8 : 1, transition: 'opacity 0.2s' }}
        >
          {deferredParts.map((part, index) => {
            if (part.type === 'text' && part.text !== '') {
              return (
                <GithubFlavorMarkdown
                  key={index}
                  className={styles.markdown}
                  onLinkClicked={(external) => {
                    if (!external) setPanelWidth(MINIMAL_PANEL_SIZE);
                  }}
                >
                  {part.text}
                </GithubFlavorMarkdown>
              );
            }
            if (part.type === 'tool-invocation') {
              return (
                <>
                  <ToolsProgress key={index} part={part} />
                  <>
                    <ToolsComponents part={part} />
                    {/* This tool component has been disabled yet */}
                    {/* <ToolArticles message={value} /> */}
                  </>
                </>
              );
            }
            return null;
          })}
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
    } catch (ex) {
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
  } catch (ex) {
    return '';
  }
}
