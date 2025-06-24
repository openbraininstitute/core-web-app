'use client';

import React, { AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { ToolInvocation, UIMessage } from '@ai-sdk/ui-utils';
import ReactMarkdown from 'react-markdown';

import ToolArticles from '../../../services/ai-agent/tools/articles/tool-articles';
import ToolMorphologies from '../../../services/ai-agent/tools/morphologies/tool-morphologies';
import { IconPrice } from '../icons/price';
import ToolsProgress from './tools-progress';
import { classNames } from '@/util/utils';
import { AiAgentRateLimit } from '@/services/ai-agent';

import styles from './message-item.module.css';

export interface MessageItemProps {
  className?: string;
  value: UIMessage;
  hideTools: boolean;
  rateLimit: AiAgentRateLimit | null;
}

export default function MessageItem({ className, value, hideTools, rateLimit }: MessageItemProps) {
  const debug = useDebug();
  return (
    <div className={classNames(className, styles.messageItem)}>
      {renderMessage(value, hideTools, debug, rateLimit)}
    </div>
  );
}

function renderMessage(
  value: UIMessage,
  hideTools: boolean,
  debug: boolean,
  rateLimit: AiAgentRateLimit | null
): React.ReactNode {
  switch (value.role) {
    case 'user':
      console.log('🚀 [message-item] rateLimit =', rateLimit); // @FIXME: Remove this line written on 2025-06-24 at 09:18
      return (
        <div className={styles.user}>
          <div className={styles.userContent}>
            <div>{value.content}</div>
          </div>
          <div className={styles.info}>
            <div className={styles.timestamp}>{value.createdAt && formatDate(value.createdAt)}</div>
            {rateLimit && (
              <div className={styles.price}>
                <IconPrice />
                <div>
                  {rateLimit.limit - rateLimit.remaining} credit
                  {rateLimit.limit - rateLimit.remaining > 1 ? 's' : ''}
                  <em>{Math.max(0, rateLimit.remaining)} free left</em>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    case 'assistant': {
      return (
        <>
          <ToolsProgress message={value} />
          {value.content.trim().length > 0 && (
            <ReactMarkdown
              className={styles.markdown}
              components={{
                a: LinkWithExternalTarget,
              }}
            >
              {value.content}
            </ReactMarkdown>
          )}
          {!hideTools && (
            <>
              <ToolArticles message={value} />
              <ToolMorphologies message={value} />
            </>
          )}
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

function formatDate(d: Date): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return formatter.format(d);
}
