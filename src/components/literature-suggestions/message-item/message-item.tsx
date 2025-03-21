'use client';

import React from 'react';
import { ToolInvocation, UIMessage } from '@ai-sdk/ui-utils';
import ReactMarkdown from 'react-markdown';

import ScientistURL from './scientist.webp';
import ToolArticles from './tools/articles/tool-articles';
import ToolMorphologies from './tools/morphologies/tool-morphologies';
import { classNames } from '@/util/utils';
import ProgressiveImage from '@/components/LandingPage/components/ProgressiveImage';

import styles from './message-item.module.css';

export interface MessageItemProps {
  className?: string;
  value: UIMessage;
}

export default function MessageItem({ className, value }: MessageItemProps) {
  return <div className={classNames(className, styles.messageItem)}>{renderMessage(value)}</div>;
}

function renderMessage(value: UIMessage): React.ReactNode {
  switch (value.role) {
    case 'user':
      return (
        <div className={styles.user}>
          <div className={styles.iconContainer}>
            <ProgressiveImage
              className={styles.icon}
              src={ScientistURL.src}
              width={ScientistURL.width}
              height={ScientistURL.height}
            />
          </div>
          <div className={styles.userContent}>{value.content}</div>
        </div>
      );
    case 'assistant': {
      return (
        <>
          <ToolArticles message={value} />
          <ToolMorphologies message={value} />
          <ReactMarkdown className={styles.markdown}>{value.content}</ReactMarkdown>
          <button
            type="button"
            className={styles.debugButton}
            onClick={() => {
              debug(value);
            }}
          >
            Debug...
          </button>
        </>
      );
    }
    default:
      return <pre>{JSON.stringify(value, null, '  ')}</pre>;
  }
}

function debug(value: UIMessage) {
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
