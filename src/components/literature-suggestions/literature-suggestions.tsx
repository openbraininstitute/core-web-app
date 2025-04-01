'use client';

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import React from 'react';

import ErrorPanel from './error';
import MessageItem from './message-item';
import Prompt from './prompt';
import { Spinner } from './spinner';
import SuggestedQuestions from './suggested-questions';

import { useServiceAiAgentChat, useServiceAiAgentThread } from '@/services/ai-agent';
import { classNames } from '@/util/utils';

import styles from './literature-suggestions.module.css';

export interface LiteratureSuggestionsProps {
  className?: string;
}

export default function LiteratureSuggestions({ className }: LiteratureSuggestionsProps) {
  const [collapsedPanel, setCollapsedPanel] = React.useState(false);
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const [threadId, recreateThreadId] = useServiceAiAgentThread();
  const [prompt, setPrompt] = React.useState('');
  const { messages, clear, status, append, error } = useServiceAiAgentChat(threadId ?? '');
  const handleQuery = React.useCallback(
    (content: string) => {
      append({
        role: 'user',
        content,
      });
      setPrompt('');
    },
    [append]
  );
  React.useEffect(() => {
    globalThis.setTimeout(() => refChatBottom.current?.scrollIntoView(), 200);
  }, [messages, error]);
  const handleClearChat = () => {
    clear();
    recreateThreadId();
  };

  return (
    <div
      className={classNames(
        className,
        styles.literatureSuggestions,
        collapsedPanel && styles.collapsed
      )}
    >
      <button
        className={styles.header}
        type="button"
        onClick={() => setCollapsedPanel(!collapsedPanel)}
      >
        <h1 title={status}>AI Assistant</h1>
        {collapsedPanel ? <PlusOutlined className="w-5 h-5" /> : <MinusOutlined />}
      </button>
      {!collapsedPanel && (
        <>
          {threadId ? (
            <>
              <div className={styles.articles}>
                {messages.map((item, messageIndex) => (
                  <MessageItem
                    key={item.id}
                    value={item}
                    hideTools={messageIndex === messages.length - 1 && status !== 'ready'}
                  />
                ))}
                {status === 'ready' && messages.length > 0 && (
                  <div className={styles.footerButtons}>
                    <button type="button" className={styles.actionButton} onClick={handleClearChat}>
                      Clear the Chat
                    </button>
                  </div>
                )}
                {error && <ErrorPanel value={error} />}
                <div ref={refChatBottom} className={styles.bottom} />
              </div>

              <footer>
                {messages.length === 0 && (
                  <SuggestedQuestions
                    onClick={(selectedPrompt) => {
                      setPrompt(selectedPrompt);
                      handleQuery(selectedPrompt);
                    }}
                  />
                )}
                {(status === 'ready' || status === 'error') && (
                  <Prompt value={prompt} onChange={setPrompt} onClick={handleQuery} />
                )}
                {status !== 'ready' && status !== 'error' && <Spinner />}
              </footer>
            </>
          ) : (
            status !== 'error' && <Spinner />
          )}
        </>
      )}
    </div>
  );
}
