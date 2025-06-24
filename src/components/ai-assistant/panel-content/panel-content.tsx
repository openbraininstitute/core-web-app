import React from 'react';

import MessageItem from '../message-item';
import { IconClear } from '../icons/clear';
import ErrorPanel from '../error';
import { Spinner } from '../spinner';
import Welcome from './welcome';
import Footer from './footer';

import { useServiceAiAgentChat } from '@/services/ai-agent';

import styles from './panel-content.module.css';

export interface PanelContentProps {
  threadId: string | undefined;
  onClearChat(): void;
}

export default function PanelContent({ threadId, onClearChat }: PanelContentProps) {
  const { messages, clear, status, append, error, stop, rateLimit } = useServiceAiAgentChat(
    threadId ?? ''
  );
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    globalThis.setTimeout(() => refChatBottom.current?.scrollIntoView(), 200);
  }, [messages, error]);
  const handleClearChat = () => {
    clear();
    onClearChat();
  };
  const handlePrompt = (content: string) => {
    append({
      role: 'user',
      content,
    });
  };

  return (
    <>
      {messages.length === 0 && <Welcome />}
      {threadId ? (
        <>
          <div className={styles.articles}>
            {messages.map((item, messageIndex) => (
              <MessageItem
                key={item.id}
                value={item}
                hideTools={messageIndex === messages.length - 1 && status !== 'ready'}
                rateLimit={rateLimit}
              />
            ))}
            {status === 'ready' && messages.length > 0 && (
              <div className={styles.footerButtons}>
                <button type="button" className={styles.actionButton} onClick={handleClearChat}>
                  <IconClear />
                  <div>Clear chat</div>
                </button>
              </div>
            )}
            {error && <ErrorPanel value={error} />}
            <div ref={refChatBottom} className={styles.bottom} />
          </div>
          <Footer
            status={status}
            threadId={threadId}
            onPrompt={handlePrompt}
            messagesCount={messages.length}
            stop={stop}
          />
        </>
      ) : (
        status !== 'error' && <Spinner />
      )}
    </>
  );
}
