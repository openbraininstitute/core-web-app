'use client';

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import React from 'react';

import ErrorPanel from './error';
import MessageItem from './message-item';
import Prompt from './prompt';
import { Spinner } from './spinner';
import SuggestedQuestions from './suggested-questions';
import { useCollapsedPanel } from './hooks';
import { classNames } from '@/util/utils';
import { useServiceAiAgentChat, useServiceAiAgentThread } from '@/services/ai-agent';

import styles from './literature-suggestions.module.css';

export interface LiteratureSuggestionsProps {
  className?: string;
}

export default function LiteratureSuggestions({ className }: LiteratureSuggestionsProps) {
  const [collapsedPanel, setCollapsedPanel] = useCollapsedPanel();
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const [threadId, recreateThreadId] = useServiceAiAgentThread();
  const [prompt, setPrompt] = React.useState('');
  const { messages, clear, status, append, error, stop } = useServiceAiAgentChat(threadId ?? '');

  // TODO: for future improvement, to disable the spinner for user has not virtual lab
  // const userStats = useAtomValue(userStatsAtom);
  // const userHasVirtualLab = Boolean(userStats?.data?.owned_labs_count);

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
      className={classNames(className, styles.literatureSuggestions)}
      data-collapsed={collapsedPanel}
    >
      <button
        className={styles.header}
        type="button"
        onClick={() => setCollapsedPanel(!collapsedPanel)}
      >
        <h1 title={status}>AI Assistant</h1>
        {collapsedPanel ? (
          <PlusOutlined className="h-[1em] w-[1em]" />
        ) : (
          <MinusOutlined className="w-[1em]" />
        )}
      </button>
      {!collapsedPanel && (
        <>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <div>
                <p>Welcome to the OBI platform! </p>
                <p>
                  I&apos;m here to help with your literature searches, and soon, I&apos;ll assist
                  you in exploring our database and setting up your own simulations.
                </p>
              </div>
            </div>
          )}
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
                {status === 'ready' && (
                  <SuggestedQuestions
                    threadId={threadId}
                    messagesLength={messages.length}
                    onClick={(selectedPrompt) => {
                      setPrompt(selectedPrompt);
                      handleQuery(selectedPrompt);
                    }}
                  />
                )}
                {(status === 'ready' || status === 'error') && (
                  <Prompt value={prompt} onChange={setPrompt} onClick={handleQuery} />
                )}
                {status !== 'ready' && status !== 'error' && (
                  <div className={styles.spinnerContainer}>
                    <Spinner />
                    {status === 'streaming' && (
                      <button className={styles.cancelButton} type="button" onClick={stop}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
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
