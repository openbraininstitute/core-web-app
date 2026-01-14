import React from "react";
import { useIsFetching } from "@tanstack/react-query";

import Welcome from "../welcome";
import { MessageItem } from "../../message-item";
import { IconClear } from "../../icons/clear";
import SuggestedQuestions from "../../suggested-questions";
import ErrorPanel from "../../error";
import Footer from "../footer";

import { IconPrice } from "../../icons/price";
import {
  useServiceAiAgentChat,
  useServiceAiAgentSuggestionFromUserJourney,
} from "@/services/ai-agent";
import { classNames } from "@/util/utils";

import styles from "./chat.module.css";

export interface ChatProps {
  className?: string;
  threadId: string;
  onClearChat(): void;
}

export default function Chat({ className, threadId, onClearChat }: ChatProps) {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);
  const { messages, clear, status, append, error, stop, rateLimitRemaining } =
    useServiceAiAgentChat(threadId ?? "");
  const [suggestions, clearSuggestions, isLoadingSuggestions] =
    useServiceAiAgentSuggestionFromUserJourney(threadId ?? "", status);
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const refContainer = React.useRef<HTMLDivElement | null>(null);
  const isStorageQueryFetching = useIsFetching({
    predicate: (query) => {
      const fullQueryKey = query.queryKey.at(0);
      return fullQueryKey === "storage";
    },
    fetchStatus: "fetching",
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

    const resizeObserver = new ResizeObserver(updateScrollHeight);
    resizeObserver.observe(container);

    updateScrollHeight();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [isAutoScrollEnabled]);

  React.useEffect(() => {
    if (isAutoScrollEnabled && refContainer.current) {
      setTimeout(() => {
        refChatBottom.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [scrollHeight, isAutoScrollEnabled, isStorageQueryFetching]);

  const handleClearChat = () => {
    onClearChat();
    clear();
  };
  const handlePrompt = (content: string) => {
    setIsAutoScrollEnabled(true);
    append({
      role: "user",
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
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 200;
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

        {status === "ready" && messages.length > 0 && (
          <>
            <div className={styles.footerButtons}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={handleClearChat}
              >
                <IconClear />
                <div>New Chat</div>
              </button>
              <div className={styles.price}>
                <IconPrice />
                <div>
                  {Math.max(0, rateLimitRemaining)} free credit
                  {rateLimitRemaining > 1 ? "s" : ""} left
                </div>
              </div>
            </div>
          </>
        )}
        {suggestions !== undefined && status === "ready" && (
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
