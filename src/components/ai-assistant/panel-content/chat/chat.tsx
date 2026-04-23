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

      if (prev !== null && prev > 0 && current === 0) {
        setShowExhaustedNotification(true);
      }

      prevRemainingRef.current = current;
    }
  }, [rateLimit]);

  // --- Auto-scroll ---
  // Driven by data (messages changing), NOT by DOM observation.
  // This means plot re-renders, image resizes, and panel resizes
  // never trigger a scroll — only actual new message content does.

  const isAutoScrollRef = React.useRef(isAutoScrollEnabled);
  isAutoScrollRef.current = isAutoScrollEnabled;

  // Helper that updates both state and ref immediately so there's no
  // stale window between event handlers and the next render.
  const setAutoScroll = React.useCallback((value: boolean) => {
    isAutoScrollRef.current = value;
    setIsAutoScrollEnabled(value);
  }, []);

  const scrollToBottom = React.useCallback(() => {
    const container = refContainer.current;
    if (container) {
      container.scrollTop = container.scrollHeight - container.clientHeight;
    }
  }, []);

  // Track loading→loaded transition so we can scroll before paint.
  const wasLoadingRef = React.useRef(isLoadingMessages);

  // useLayoutEffect: runs after React commits DOM changes but BEFORE the
  // browser paints. This eliminates the 1-frame flash when messages first
  // appear after loading — we scroll to bottom before the user sees anything.
  React.useLayoutEffect(() => {
    const justFinishedLoading = wasLoadingRef.current && !isLoadingMessages;
    wasLoadingRef.current = isLoadingMessages;

    if (justFinishedLoading && messages.length > 0) {
      setAutoScroll(true);
      scrollToBottom();
      return;
    }

    if (isAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages, isLoadingMessages, scrollToBottom, setAutoScroll]);

  // When streaming starts from anywhere and auto-scroll is still on, snap to
  // bottom. We do NOT force auto-scroll on here — if the user already scrolled
  // up between sending and the first token, we respect that.
  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    if (status === 'streaming' && prevStatusRef.current !== 'streaming') {
      if (isAutoScrollRef.current) {
        requestAnimationFrame(scrollToBottom);
      }
    }
    prevStatusRef.current = status;
  }, [status, scrollToBottom]);

  // When switching threads, go to bottom.
  React.useEffect(() => {
    setAutoScroll(true);
    scrollToBottom();
  }, [threadId, scrollToBottom, setAutoScroll]);

  const handlePrompt = (content: string) => {
    setAutoScroll(true);
    append({
      role: 'user',
      content,
    });
    // Scroll now and after React renders the new user message.
    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (event.deltaY < 0) {
      // Scrolling up — user wants to read earlier content.
      setAutoScroll(false);
    } else {
      const container = refContainer.current;
      if (!container) return;
      const isAtBottom =
        container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      if (isAtBottom) {
        setAutoScroll(true);
      }
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
        <div className={styles.bottom} />
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
