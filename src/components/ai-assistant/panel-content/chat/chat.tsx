import { useIsFetching } from '@tanstack/react-query';
import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  useServiceAiAgentChat,
  useServiceAiAgentSuggestionFromUserJourney,
  useAiAgentRateLimit,
} from '@/services/ai-agent';
import { classNames } from '@/util/utils';
import { atomRateLimit } from '../../state';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import ErrorPanel from '../../error';
import { IconClear } from '../../icons/clear';
import { MessageItem } from '../../message-item';
import SuggestedQuestions from '../../suggested-questions';
import FreeCreditsNotification from '../../free-credits-notification';
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
  const { messages, clear, status, append, error, stop } = useServiceAiAgentChat(threadId ?? '');
  const [suggestions, clearSuggestions, isLoadingSuggestions] =
    useServiceAiAgentSuggestionFromUserJourney(threadId ?? '', status);
  
  const assistant = useAiAssistant();
  const { accessToken } = assistant.useContext();
  const rateLimit = useAtomValue(atomRateLimit);
  const setRateLimit = useSetAtom(atomRateLimit);
  const prevRemainingRef = React.useRef<number | null>(null);
  const [showExhaustedNotification, setShowExhaustedNotification] = React.useState(false);

  // Fetch rate limit on mount
  const { data: fetchedRateLimit, isLoading, error: fetchError } = useAiAgentRateLimit(accessToken);
  const hasInitializedRef = React.useRef(false);
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);

  console.log('[Rate Limit] Hook state:', {
    accessToken: accessToken ? 'present' : 'missing',
    fetchedRateLimit,
    isLoading,
    fetchError,
    rateLimit,
    prevRef: prevRemainingRef.current,
    hasInitializedRef: hasInitializedRef.current,
  });

  // Initialize rate limit from API on mount AND set the ref
  // This runs ONCE when the fetched data first arrives
  React.useEffect(() => {
    if (fetchedRateLimit && !hasInitializedRef.current) {
      const chatStreamedLimit = fetchedRateLimit.chat_streamed;
      console.log('[Rate Limit] Initial fetch from API:', chatStreamedLimit);
      
      // Only set rate limit if it doesn't exist yet
      if (!rateLimit) {
        setRateLimit(chatStreamedLimit);
      }
      
      // Always initialize the ref from the API data
      prevRemainingRef.current = chatStreamedLimit.remaining;
      hasInitializedRef.current = true;
      console.log('[Rate Limit] Initialized prevRef to:', chatStreamedLimit.remaining);
    }
  }, [fetchedRateLimit, rateLimit, setRateLimit]);

  // Detect when crossing the boundary from free to paid
  React.useEffect(() => {
    if (rateLimit) {
      const currentRemaining = rateLimit.remaining;
      const prevRemaining = prevRemainingRef.current;

      console.log('[Rate Limit Boundary Check]', {
        prevRemaining,
        currentRemaining,
        willShowNotification: prevRemaining !== null && prevRemaining > 0 && currentRemaining === 0,
        currentShowState: showExhaustedNotification,
      });

      // Crossing boundary: had free credits before, now at 0
      if (prevRemaining !== null && prevRemaining > 0 && currentRemaining === 0) {
        console.log('[Rate Limit] ✅ SHOWING exhausted notification');
        setShowExhaustedNotification(true);
      } else {
        console.log('[Rate Limit] ❌ NOT showing notification because:', {
          prevIsNull: prevRemaining === null,
          prevNotPositive: prevRemaining !== null && prevRemaining <= 0,
          currentNotZero: currentRemaining !== 0,
        });
      }

      prevRemainingRef.current = currentRemaining;
      console.log('[Rate Limit] Updated prevRemainingRef to:', currentRemaining);
    } else {
      console.log('[Rate Limit] No rateLimit data yet');
    }
  }, [rateLimit, showExhaustedNotification]);

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

  const handleClearChat = () => {
    onClearChat();
    clear();
    setShowExhaustedNotification(false);
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
              {/* {rateLimit && rateLimit.remaining === 0 && (
                <div className={styles.paidCreditsIndicator}>Using Credit Balance</div>
              )} */}
            </div>
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
          <FreeCreditsNotification onDismiss={() => setShowExhaustedNotification(false)} />
        </div>
      )}
      {rateLimit && rateLimit.remaining === 0 && (
        <div className={styles.creditBalanceIndicator}>Using Credit Balance</div>
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
