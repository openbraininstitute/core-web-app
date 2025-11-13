import React from 'react';

import Welcome from '../welcome';
import MessageItem from '../../message-item';
import { IconClear } from '../../icons/clear';
import SuggestedQuestions from '../../suggested-questions';
import ErrorPanel from '../../error';
import Footer from '../footer';

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
  const refScrollLocked = React.useRef(true);
  const refScrollTriggered = React.useRef(true);
  const { messages, clear, status, append, error, stop, rateLimit } = useServiceAiAgentChat(
    threadId ?? ''
  );
  const [suggestions] = useServiceAiAgentSuggestionFromUserJourney(threadId ?? '', 3);
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);
  const scroll = () => {
    if (!refScrollLocked.current) return;

    const div = refContainer.current;
    if (!div) return;

    refScrollTriggered.current = true;
    const scrollTop = Math.max(0, div.scrollHeight - div.clientHeight);
    div.scrollTo({
      top: scrollTop,
      behavior: 'smooth',
    });
  };
  React.useEffect(scroll, [messages, error, status]);
  React.useEffect(() => {
    if (status !== 'ready' || suggestions.length === 0) return;

    scroll();
    globalThis.setTimeout(scroll, 2000);
  }, [suggestions, status]);
  const handleClearChat = () => {
    onClearChat();
    clear();
  };
  const handlePrompt = (content: string) => {
    refScrollLocked.current = true;
    append({
      role: 'user',
      content,
    });
  };
  const handleScroll = () => {
    if (!refScrollTriggered.current) refScrollLocked.current = false;
    refScrollTriggered.current = false;
  };

  return (
    <>
      <div
        className={classNames(styles.articles, className)}
        ref={refContainer}
        onScrollEnd={handleScroll}
      >
        {messages.length === 0 && <Welcome />}
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
                <div>New Chat</div>
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
