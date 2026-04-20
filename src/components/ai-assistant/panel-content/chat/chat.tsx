import { useIsFetching } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import React from 'react';

import { useAccessToken } from '@/hooks/useAccessToken';
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
import { ThinkingIndicator } from '../../message-item/thinking-indicator';
import { atomRateLimit } from '../../state';
import SuggestedQuestions from '../../suggested-questions';
import Footer from '../footer';
import TabTransitionLoader from '../tab-transition-loader/tab-transition-loader';
import Welcome from '../welcome';

import styles from './chat.module.css';

export interface ChatProps {
  className?: string;
  threadId: string | undefined;
  onRefetchSuggestions?: (fn: () => void) => void;
  onClearSuggestions?: (fn: () => void) => void;
}

export default function Chat({
  className,
  threadId,
  onRefetchSuggestions,
  onClearSuggestions,
}: ChatProps) {
  const assistant = useAiAssistant();
  const isEmptyThread = assistant.isEmptyThread.useValue();
  const healthError = assistant.healthError.useValue();
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);

  const { messages, status, append, error, stop, isLoadingMessages } = useServiceAiAgentChat(
    threadId ?? ''
  );
  const [suggestions, clearSuggestions, isLoadingSuggestions, refetchSuggestions] =
    useServiceAiAgentSuggestionFromUserJourney(threadId ?? '', status);

  React.useEffect(() => {
    onRefetchSuggestions?.(refetchSuggestions);
    onClearSuggestions?.(clearSuggestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchSuggestions]);

  const accessToken = useAccessToken();
  const rateLimit = useAtomValue(atomRateLimit);
  const setRateLimit = useSetAtom(atomRateLimit);
  const [showExhaustedNotification, setShowExhaustedNotification] = React.useState(false);
  const prevRemainingRef = React.useRef<number | null>(null);
  const hasInitializedRef = React.useRef(false);

  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);

  // Fetch rate limit on mount and store in atom (only once)
  const { data: fetchedRateLimit } = useAiAgentRateLimit(accessToken ?? null);

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

  React.useEffect(() => {
    if (isAutoScrollEnabled && refContainer.current) {
      setTimeout(() => {
        refChatBottom.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }, [scrollHeight, isAutoScrollEnabled, isStorageQueryFetching]);

  // Reset scroll position when switching threads
  React.useEffect(() => {
    setIsAutoScrollEnabled(true);
  }, [threadId]);

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

  const lastMessage = messages[messages.length - 1];
  const hasVisibleContent = lastMessage?.parts.some(
    (p) => (p.type === 'text' && p.text !== '') || p.type === 'tool-invocation'
  );
  const showThinking = status === 'submitted' || (status === 'streaming' && !hasVisibleContent);

  return (
    <div className={classNames(styles.chatContainer, className)}>
      <div className={styles.articles} ref={refContainer} onWheel={handleWheel}>
        {threadId && isLoadingMessages && !isEmptyThread ? (
          <TabTransitionLoader message="Loading conversation..." />
        ) : (
          <>
            {(!threadId || isEmptyThread) && <Welcome />}
            {messages.map((item, index) => (
              <MessageItem
                key={item.id}
                value={item}
                status={status}
                isLastMessage={index === messages.length - 1}
              />
            ))}

            {showThinking && <ThinkingIndicator />}
            {status === 'ready' && messages.length > 0 && (
              <div className={styles.footerButtons}></div>
            )}
            {(!threadId || isEmptyThread) && (
              <div className={styles.suggestedQuestionsContainer}>
                <SuggestedQuestions
                  threadId={threadId}
                  onClick={handlePrompt}
                  suggestions={suggestions}
                  clearSuggestions={clearSuggestions}
                  isLoading={isLoadingSuggestions || status !== 'ready'}
                />
              </div>
            )}
            {threadId && !isEmptyThread && status === 'ready' && (
              <div className={styles.suggestedQuestionsContainerInChat}>
                <SuggestedQuestions
                  threadId={threadId}
                  onClick={handlePrompt}
                  suggestions={suggestions}
                  clearSuggestions={clearSuggestions}
                  isLoading={isLoadingSuggestions || status !== 'ready'}
                />
              </div>
            )}
            {error && <ErrorPanel value={error} />}
            {healthError && <ErrorPanel value={healthError} />}
          </>
        )}
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
        className={styles.footer}
        status={status}
        threadId={threadId}
        onPrompt={handlePrompt}
        messagesCount={messages.length}
        stop={stop}
      />
    </div>
  );
}
