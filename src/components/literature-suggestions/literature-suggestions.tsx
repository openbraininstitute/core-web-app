'use client';

import React from 'react';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

import SuggestedQuestions from './suggested-questions';
import MessageItem from './message-item';
import Prompt from './prompt';
import { Spinner } from './spinner';
import { classNames } from '@/util/utils';
import { useServiceAiAgentChat, useServiceAiAgentThread } from '@/services/ai-agent';

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
    refChatBottom.current?.scrollIntoView();
  }, [messages]);
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
        <h1>Explore AI</h1>
        {collapsedPanel ? <PlusOutlined /> : <MinusOutlined />}
      </button>
      {!collapsedPanel && (
        <>
          {threadId ? (
            <>
              {error ? (
                <div className={styles.error}>{JSON.stringify(error, null, '  ')}</div>
              ) : (
                <div className={styles.articles}>
                  {messages.map((item) => (
                    <MessageItem key={item.id} value={item} />
                  ))}
                  {status === 'ready' ? (
                    messages.length > 0 && (
                      <div className={styles.footerButtons}>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={handleClearChat}
                        >
                          Clear the Chat
                        </button>
                      </div>
                    )
                  ) : (
                    <Spinner />
                  )}
                  <div ref={refChatBottom} className={styles.bottom} />
                </div>
              )}
              <footer>
                {messages.length === 0 && (
                  <SuggestedQuestions
                    onClick={(selectedPrompt) => {
                      setPrompt(selectedPrompt);
                      handleQuery(selectedPrompt);
                    }}
                  />
                )}
                <Prompt value={prompt} onChange={setPrompt} onClick={handleQuery} />
              </footer>
            </>
          ) : (
            <Spinner />
          )}
        </>
      )}
    </div>
  );
}
