import React from 'react';

import MessageItem from '../message-item';
import { IconClear } from '../icons/clear';
import ErrorPanel from '../error';
import { Spinner } from '../spinner';
import SuggestedQuestions from '../suggested-questions';
import Welcome from './welcome';
import Footer from './footer';

import {
  useServiceAiAgentChat,
  useServiceAiAgentSuggestionFromUserJourney,
} from '@/services/ai-agent';

import styles from './panel-content.module.css';

interface PanelContentProps {
  threadId: string | undefined;
  onClearChat(): void;
}

export default function PanelContent({ threadId, onClearChat }: PanelContentProps) {
  const { messages, clear, status, append, error, stop, rateLimit } = useServiceAiAgentChat(
    threadId ?? ''
  );
  const [suggestions] = useServiceAiAgentSuggestionFromUserJourney(threadId ?? '', 3);
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);
  const scroll = () => {
    const div = refContainer.current;
    if (!div) return;

    const scrollTop = Math.max(0, div.scrollHeight - div.clientHeight);
    div.scrollTo({
      top: scrollTop,
      behavior: 'smooth',
    });
  };
  // refChatBottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  React.useEffect(scroll, [messages, error, status]);
  React.useEffect(() => {
    if (status !== 'ready' || suggestions.length === 0) return;

    scroll();
    globalThis.setTimeout(scroll, 2000);
  }, [suggestions, status]);
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
          <div className={styles.articles} ref={refContainer}>
            {messages.map((item, messageIndex) => (
              <MessageItem
                key={item.id}
                value={item}
                hideTools={messageIndex === messages.length - 1 && status !== 'ready'}
                rateLimit={rateLimit}
              />
            ))}
            {status === 'ready' && messages.length > 0 && (
              <>
                <div className={styles.footerButtons}>
                  <button type="button" className={styles.actionButton} onClick={handleClearChat}>
                    <IconClear />
                    <div>Clear chat</div>
                  </button>
                </div>
                <SuggestedQuestions
                  threadId={threadId}
                  messagesLength={messages.length}
                  onClick={handlePrompt}
                />
              </>
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
