'use client';

import React, { AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { ToolInvocation, UIMessage } from '@ai-sdk/ui-utils';
import ReactMarkdown from 'react-markdown';

import ToolArticles from './tools/articles/tool-articles';
import ToolMorphologies from './tools/morphologies/tool-morphologies';
import { classNames } from '@/util/utils';

import styles from './message-item.module.css';

export interface MessageItemProps {
  className?: string;
  value: UIMessage;
}

export default function MessageItem({ className, value }: MessageItemProps) {
  const debug = useDebug();
  return (
    <div className={classNames(className, styles.messageItem)}>{renderMessage(value, debug)}</div>
  );
}

function renderMessage(value: UIMessage, debug: boolean): React.ReactNode {
  switch (value.role) {
    case 'user':
      return (
        <div className={styles.user}>
          {/* <div className={styles.userAvatar}><ChevronRight fill="currentColor" /></div> */}
          <div className={styles.userContent}>
            <div>{value.content}</div>
          </div>
        </div>
      );
    case 'assistant': {
      return (
        <>
          <ToolArticles message={value} />
          <ToolMorphologies message={value} />
          <ReactMarkdown
            className={styles.markdown}
            components={{
              a: LinkWithExternalTarget,
            }}
          >
            {value.content}
          </ReactMarkdown>
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
        </>
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

function LinkWithExternalTarget({ href, children }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) return null;

  return (
    <Link href={href} target="_blank">
      {children}
    </Link>
  );
}
