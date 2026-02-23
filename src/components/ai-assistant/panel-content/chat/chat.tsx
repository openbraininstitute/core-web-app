import { useIsFetching } from '@tanstack/react-query';
import { atom } from 'jotai';
import React from 'react';
import {
  useServiceAiAgentChat,
  useServiceAiAgentSuggestionFromUserJourney,
} from '@/services/ai-agent';
import { classNames } from '@/util/utils';
import ErrorPanel from '../../error';
import { IconPrice } from '../../icons/price';
import { MessageItem } from '../../message-item';
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
  const { messages, status, append, error, stop, rateLimitRemaining } = useServiceAiAgentChat(
    threadId ?? ''
  );
  const [suggestions, clearSuggestions, isLoadingSuggestions] =
    useServiceAiAgentSuggestionFromUserJourney(threadId ?? '', status);

  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);
  const isStorageQueryFetching = useIsFetching({
    predicate: (query) => {
      const fullQueryKey = query.queryKey.at(0);
      return fullQueryKey === 'storage';
    },
    fetchStatus: 'fetching',
  });

  const [scrollHeight, setScrollHeight] = React.useState(0);

  // Track state history from editstate tool invocations
  const stateHistory = React.useMemo(() => {
    const history: Map<number, unknown> = new Map();
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (message.role !== 'assistant') continue;

      for (const part of message.parts) {
        if (part.type !== 'tool-invocation') continue;
        if (part.toolInvocation.toolName !== 'editstate') continue;
        if (part.toolInvocation.state !== 'result') continue;

        try {
          const result = JSON.parse(part.toolInvocation.result as string);
          const state = result?.state?.smc_simulation_config;
          
          if (state) {
            // Find the previous state by looking backwards
            let previousState = null;
            for (let j = i - 1; j >= 0; j--) {
              const prevMessage = messages[j];
              if (prevMessage.role !== 'assistant') continue;

              for (const prevPart of prevMessage.parts) {
                if (prevPart.type !== 'tool-invocation') continue;
                if (prevPart.toolInvocation.state !== 'result') continue;

                // Check for editstate or getstate
                if (prevPart.toolInvocation.toolName === 'editstate') {
                  try {
                    const prevResult = JSON.parse(prevPart.toolInvocation.result as string);
                    previousState = prevResult?.state?.smc_simulation_config;
                    break;
                  } catch {
                    // Ignore parse errors
                  }
                }
              }
              if (previousState) break;
            }
            
            history.set(i, previousState);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    return history;
  }, [messages]);

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
        {messages.map((item, index) => (
          <MessageItem key={item.id} value={item} previousState={stateHistory.get(index)} />
        ))}

        {status === 'ready' && messages.length > 0 && (
          <>
            <div className={styles.footerButtons}>
              <div className={styles.price}>
                <IconPrice />
                <div>
                  {Math.max(0, rateLimitRemaining)} free credit
                  {rateLimitRemaining > 1 ? 's' : ''} left
                </div>
              </div>
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
