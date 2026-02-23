import { useIsFetching } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import React from 'react';

import {
  useAiAgentRateLimit,
  useServiceAiAgentChat,
  useServiceAiAgentSuggestionFromUserJourney,
} from '@/services/ai-agent';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import { classNames } from '@/util/utils';

import ErrorPanel from '../../error';
import FreeCreditsNotification from '../../free-credits-notification';
import { MessageItem } from '../../message-item';
import { atomRateLimit } from '../../state';
import SuggestedQuestions from '../../suggested-questions';
import Footer from '../footer';
import Welcome from '../welcome';

import styles from './chat.module.css';

export interface ChatProps {
  className?: string;
  threadId: string;
}

export default function Chat({ className, threadId }: ChatProps) {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);

  const { messages, status, append, error, stop } = useServiceAiAgentChat(threadId ?? '');
  const [suggestions, clearSuggestions, isLoadingSuggestions] =
    useServiceAiAgentSuggestionFromUserJourney(threadId ?? '', status);

  const assistant = useAiAssistant();
  const { accessToken } = assistant.useContext();
  const rateLimit = useAtomValue(atomRateLimit);
  const setRateLimit = useSetAtom(atomRateLimit);
  const [showExhaustedNotification, setShowExhaustedNotification] = React.useState(false);
  const prevRemainingRef = React.useRef<number | null>(null);
  const hasInitializedRef = React.useRef(false);

  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);

  // Fetch rate limit on mount and store in atom (only once)
  const { data: fetchedRateLimit } = useAiAgentRateLimit(accessToken);

  React.useEffect(() => {
    if (fetchedRateLimit && !hasInitializedRef.current) {
      setRateLimit(fetchedRateLimit.chat_streamed);
      prevRemainingRef.current = fetchedRateLimit.chat_streamed.remaining;
      hasInitializedRef.current = true;
    }
  }, [fetchedRateLimit, setRateLimit]);

  // Show notification only when crossing boundary (1 -> 0)
  React.useEffect(() => {
    if (rateLimit && hasInitializedRef.current) {
      const prev = prevRemainingRef.current;
      const current = rateLimit.remaining;

      // Only show if we had credits before and now we don't
      if (prev !== null && prev > 0 && current === 0) {
        setShowExhaustedNotification(true);
      }

      prevRemainingRef.current = current;
    }
  }, [rateLimit]);

  const isStorageQueryFetching = useIsFetching({
    predicate: (query) => {
      const fullQueryKey = query.queryKey.at(0);
      return fullQueryKey === 'storage';
    },
    fetchStatus: 'fetching',
  });

  const [scrollHeight, setScrollHeight] = React.useState(0);

  // Monitor scroll height changes for auto-scroll
  React.useEffect(() => {
    if (!refContainer.current) return;

    const container = refContainer.current;
    let previousScrollHeight = container.scrollHeight;

    const updateScrollHeight = () => {
      const newScrollHeight = container.scrollHeight;

      if (isAutoScrollEnabled && newScrollHeight > previousScrollHeight) {
        requestAnimationFrame(() => {
          const maxScroll = container.scrollHeight - container.clientHeight;
          if (maxScroll > 0) {
            container.scrollTop = maxScroll;
          }
        });
      }

      setScrollHeight(newScrollHeight);
      previousScrollHeight = newScrollHeight;
    };

    const observer = new MutationObserver(updateScrollHeight);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    updateScrollHeight();

    return () => {
      observer.disconnect();
    };
  }, [isAutoScrollEnabled]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: @Nicolas can give more details
  React.useEffect(() => {
    if (isAutoScrollEnabled && refContainer.current) {
      setTimeout(() => {
        refChatBottom.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, [scrollHeight, isAutoScrollEnabled, isStorageQueryFetching]);

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
            <div className={styles.footerButtons}></div>
          </>
        )}
        {suggestions !== undefined && status === 'ready' && (
          <div className={styles.suggestedQuestionsContainer}>
            <SuggestedQuestions
              threadId={threadId}
              messagesLength={messages.length}
              onClick={handlePrompt}
              suggestions={suggestions}
              clearSuggestions={clearSuggestions}
              isLoading={isLoadingSuggestions}
            />
          </div>
        )}
        {error && <ErrorPanel value={error} />}
        <div ref={refChatBottom} className={styles.bottom} />
      </div>
      {showExhaustedNotification && status === 'ready' && (
        <div className={styles.notificationOverlay}>
          <FreeCreditsNotification
            onDismiss={() => setShowExhaustedNotification(false)}
            resetIn={rateLimit?.reset_in ?? null}
          />
        </div>
      )}
      {rateLimit && rateLimit.remaining === 0 && status === 'ready' && (
        <div
          className={styles.creditBalanceIndicator}
          style={{ marginTop: messages.length === 0 ? '-1.2em' : '0em' }}
        >
          Using Credit Balance
        </div>
      )}
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
