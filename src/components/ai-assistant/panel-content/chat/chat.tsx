import React from 'react';

import Welcome from '../welcome';
import { MessageItem } from '../../message-item';
import { IconClear } from '../../icons/clear';
import SuggestedQuestions from '../../suggested-questions';
import ErrorPanel from '../../error';
import Footer from '../footer';

import { IconPrice } from '../../icons/price';
import {
  useServiceAiAgentChat,
  useServiceAiAgentSuggestionFromUserJourney,
} from '@/services/ai-agent';
import { classNames } from '@/util/utils';

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
  const [suggestions] = useServiceAiAgentSuggestionFromUserJourney(threadId ?? '', 3);
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (isAutoScrollEnabled) {
      refChatBottom.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages, error, status, isAutoScrollEnabled]);

  React.useEffect(() => {
    if (status !== 'ready' || suggestions.length === 0) return;
    refChatBottom.current?.scrollIntoView({ behavior: 'instant' });
    globalThis.setTimeout(
      () => refChatBottom.current?.scrollIntoView({ behavior: 'instant' }),
      2000
    );
  }, [suggestions, status]);

  // Used when plots appear in chat
  React.useEffect(() => {
    if (status === 'streaming' && isAutoScrollEnabled) {
      const interval = setInterval(() => {
        refChatBottom.current?.scrollIntoView({ behavior: 'instant' });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, isAutoScrollEnabled]);

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
      />
    </>
  );
}
