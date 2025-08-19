'use client';

import React from 'react';
import { ToolInvocation } from '@ai-sdk/ui-utils';
import { UIMessage as NewUIMessage } from '@ai-sdk/react';
import { UIMessage as OldUIMessage } from '@ai-sdk/ui-utils';

// Compatibility type that handles both old and new message formats
type CompatUIMessage = (NewUIMessage | OldUIMessage) & {
  createdAt?: Date | string;
  content?: string;
};

import ToolArticles from '../../../services/ai-agent/tools/articles/tool-articles';
import ToolMorphologies from '../../../services/ai-agent/tools/morphologies/tool-morphologies';
import { IconPrice } from '../icons/price';
import ToolsProgress from './tools-progress';
import ToolsComponents from './tools-components';
import { classNames } from '@/util/utils';
import { AiAgentRateLimit } from '@/services/ai-agent';
import { GithubFlavorMarkdown } from '@/components/github-flavor-markdown';

import { isString } from '@/util/type-guards';
import styles from './message-item.module.css';

interface MessageItemProps {
  className?: string;
  value: CompatUIMessage;
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
  value: CompatUIMessage,
  hideTools: boolean,
  debug: boolean,
  rateLimit: AiAgentRateLimit | null
): React.ReactNode {
  switch (value.role) {
    case 'user': {
      // Extract text content from both old and new formats
      const content =
        value.content ||
        (value as any).parts
          ?.filter((part: any) => part.type === 'text')
          ?.map((part: any) => ('text' in part ? part.text : ''))
          ?.join('') ||
        '';
      return (
        <div className={styles.user}>
          <div className={styles.userContent}>
            <div>{content}</div>
          </div>
          <div className={styles.info}>
            <div className={styles.timestamp}>{value.createdAt && formatDate(value.createdAt)}</div>
            {rateLimit && (
              <div className={styles.price}>
                <IconPrice />
                <div>
                  {rateLimit.limit - rateLimit.remaining} credit
                  {rateLimit.limit - rateLimit.remaining > 1 ? 's' : ''}
                  <em>
                    {Math.max(0, rateLimit.remaining)} free credit
                    {rateLimit.remaining > 1 ? 's' : ''} left
                  </em>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    case 'assistant': {
      // Extract text content from both old and new formats
      const content =
        value.content ||
        (value as any).parts
          ?.filter((part: any) => part.type === 'text')
          ?.map((part: any) => ('text' in part ? part.text : ''))
          ?.join('') ||
        '';
      return (
        <>
          <ToolsProgress message={value as any} />
          {content.trim().length > 0 && (
            <GithubFlavorMarkdown className={styles.markdown}>{content}</GithubFlavorMarkdown>
          )}
          {!hideTools && (
            <>
              <ToolsComponents message={value as any} />
              <ToolArticles message={value as any} />
              <ToolMorphologies message={value as any} />
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

function debugToConsole(value: CompatUIMessage) {
  console.log(value);
  const parts = (value as any).parts || [];
  for (const part of parts) {
    if (part.type !== 'tool-invocation') continue;

    const toolInvocation =
      (part as any).toolInvocation || (part as ToolInvocation & { result: string });

    console.debug(`%c${toolInvocation.toolName}`, 'font-weight: bolder; font-size: 110%');
    const { result } = toolInvocation;
    try {
      console.debug(JSON.parse(result));
    } catch (_ex) {
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
  } catch (_ex) {
    return '';
  }
}
