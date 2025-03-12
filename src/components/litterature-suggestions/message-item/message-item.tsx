import React from 'react';
import { UIMessage } from '@ai-sdk/ui-utils';
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
              // eslint-disable-next-line no-console
              console.debug(value);
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
