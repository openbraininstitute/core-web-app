import React from 'react';

interface UseAutoScrollOptions {
  messages: unknown[];
  status: string;
  isLoadingMessages: boolean;
  threadId: string | undefined;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useAutoScroll({
  messages,
  status,
  isLoadingMessages,
  threadId,
  containerRef,
}: UseAutoScrollOptions) {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = React.useState(true);

  const isAutoScrollRef = React.useRef(isAutoScrollEnabled);
  isAutoScrollRef.current = isAutoScrollEnabled;

  const setAutoScroll = React.useCallback((value: boolean) => {
    isAutoScrollRef.current = value;
    setIsAutoScrollEnabled(value);
  }, []);

  const scrollToBottom = React.useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight - container.clientHeight;
    }
  }, [containerRef]);

  // useLayoutEffect: scroll before paint on loading→loaded (no flash).
  // Scroll on every messages update — AI SDK v6 produces a new array ref on each streamed chunk.
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages triggers scroll on each streamed chunk
  React.useLayoutEffect(() => {
    if (isLoadingMessages) return;

    if (isAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages, isLoadingMessages, scrollToBottom]);

  const prevStatusRef = React.useRef(status);
  React.useEffect(() => {
    if (status === 'streaming' && prevStatusRef.current !== 'streaming') {
      if (isAutoScrollRef.current) {
        requestAnimationFrame(scrollToBottom);
      }
    }
    prevStatusRef.current = status;
  }, [status, scrollToBottom]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: threadId resets scroll on conversation switch
  React.useEffect(() => {
    setAutoScroll(true);
    scrollToBottom();
  }, [threadId, scrollToBottom, setAutoScroll]);

  const handleWheel = React.useCallback(
    (event: React.WheelEvent) => {
      if (event.deltaY < 0) {
        setAutoScroll(false);
      } else {
        const container = containerRef.current;
        if (!container) return;
        const isAtBottom =
          container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
        if (isAtBottom) {
          setAutoScroll(true);
        }
      }
    },
    [containerRef, setAutoScroll]
  );

  return { setAutoScroll, scrollToBottom, handleWheel };
}
