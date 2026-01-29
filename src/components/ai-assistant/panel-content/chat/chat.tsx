import { useIsFetching } from '@tanstack/react-query';
import { atom } from 'jotai';
import React from 'react';
import {
  useServiceAiAgentChat,
  useServiceAiAgentSuggestionFromUserJourney,
} from '@/services/ai-agent';
import { classNames } from '@/util/utils';
import ErrorPanel from '../../error';
import { IconClear } from '../../icons/clear';
import { IconPrice } from '../../icons/price';
import { MessageItem } from '../../message-item';
import SuggestedQuestions from '../../suggested-questions';
import Footer from '../footer';
import Welcome from '../welcome';
import styles from './chat.module.css';

export interface ChatProps {
  className?: string;
  threadId: string;
  onClearChat(): void;
}

export default function Chat({ className, threadId, onClearChat }: ChatProps) {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);
  const { messages, clear, status, append, error, stop, rateLimitRemaining } =
    useServiceAiAgentChat(threadId ?? '');
  const [suggestions, , isLoadingSuggestions] = useServiceAiAgentSuggestionFromUserJourney(
    threadId ?? ''
  );
  const isStorageQueryFetching = useIsFetching({
    predicate: (query) => {
      const fullQueryKey = query.queryKey.at(0);
      return fullQueryKey === 'storage';
    },
    fetchStatus: 'fetching',
  });
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (isAutoScrollEnabled) {
      requestAnimationFrame(() => {
        refChatBottom.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [
    messages,
    error,
    status,
    isAutoScrollEnabled,
    isStorageQueryFetching,
    suggestions,
    isLoadingSuggestions,
  ]);

  const handleClearChat = () => {
    onClearChat();
    clear();
  };
  const handlePrompt = (content: string) => {
    setIsAutoScrollEnabled(true);
    append({
      role: 'user',
      content,
    });
  };
  const handleWheel = (event: React.WheelEvent) => {
    if (event.deltaY < 0) {
      setIsAutoScrollEnabled(false);
    } else {
      const container = refContainer.current;
      if (!container) return;
      const isAtBottom =
        container.scrollHeight - container.scrollTop <= container.clientHeight + 200;
      setIsAutoScrollEnabled(isAtBottom);
    }
  };

  return (
    <>
      <div
        className={classNames(styles.articles, className)}
        ref={refContainer}
        onWheel={handleWheel}
      >
        {messages.length === 0 && <Welcome />}
        {messages.map((item) => (
          <MessageItem key={item.id} value={item} />
        ))}

        {status === 'ready' && messages.length > 0 && (
          <>
            <div className={styles.footerButtons}>
              <button type="button" className={styles.actionButton} onClick={handleClearChat}>
                <IconClear />
                <div>New Chat</div>
              </button>
              <div className={styles.price}>
                <IconPrice />
                <div>
                  {Math.max(0, rateLimitRemaining)} free credit
                  {rateLimitRemaining > 1 ? 's' : ''} left
                </div>
              </div>
            </div>
            <SuggestedQuestions
              threadId={threadId}
              messagesLength={messages.length}
              onClick={handlePrompt}
              isLoading={isLoadingSuggestions}
            />
          </>
        )}
        {error && <ErrorPanel value={error} />}
        <div ref={refChatBottom} className={styles.bottom} />
      </div>
      <Footer
        className={className}
        status={status}
        threadId={threadId}
        onPrompt={handlePrompt}
        messagesCount={messages.length}
        stop={stop}
        isLoadingSuggestions={isLoadingSuggestions}
      />
    </>
  );
}
