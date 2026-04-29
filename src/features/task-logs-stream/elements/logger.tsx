'use client';

import { RiArrowDownLine, RiArrowUpLine, RiCheckLine, RiFileCopyLine } from '@remixicon/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LogsActions } from '@/features/task-logs-stream/elements/actions';
import { LogsLoadingSkeleton } from '@/features/task-logs-stream/elements/skeleton';
import { getLogTypeConfig } from '@/features/task-logs-stream/helpers';
import { useLogSearch } from '@/features/task-logs-stream/hooks/use-log-search';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { PointerEvent, ReactNode } from 'react';
import type { IHighlightRange, ILogEntry, IMatchLocation } from '@/features/task-logs-stream/types';

const USER_SCROLL_INTENT_WINDOW_MS = 750;

interface IProps {
  entries: ILogEntry[];
  streamError: string | null;
  isLoading: boolean;
  enabled: boolean;
  searchDisabled?: boolean;
}

function highlightText({
  value,
  ranges,
  entryId,
  activeMatchId,
}: {
  value: string;
  ranges: IHighlightRange[];
  entryId: string;
  activeMatchId?: string;
}) {
  if (ranges.length === 0) return value;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range) => {
    if (range.start > cursor) {
      nodes.push(value.slice(cursor, range.start));
    }
    const matchId = `${entryId}-${range.start}-${range.end}`;
    nodes.push(
      <mark
        key={`${matchId}-${value.length}-${cursor}`}
        data-log-match-id={matchId}
        className={`
          rounded px-0.5
          ${activeMatchId === matchId ? 'bg-primary-1 ring-1 ring-primary-7' : 'bg-yellow-200'}
        `}
      >
        {value.slice(range.start, range.end + 1)}
      </mark>
    );
    cursor = range.end + 1;
  });
  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }
  return nodes;
}

function LogsGroups({
  groupedEntries,
  highlightById,
  activeMatchId,
  onCopyEntry,
  copiedEntryId,
}: {
  groupedEntries: Array<[string | null, ILogEntry[]]>;
  highlightById: Map<string, IHighlightRange[]>;
  activeMatchId?: string;
  onCopyEntry: (entry: ILogEntry) => void;
  copiedEntryId: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      {groupedEntries.map(([timestampLabel, logsForTimestamp]) => (
        <div key={`${timestampLabel ?? 'no-timestamp'}-${logsForTimestamp[0]?.id ?? 'empty'}`}>
          {timestampLabel && (
            <div
              className="mb-2 text-sm font-semibold text-gray-500"
              title={new Date(logsForTimestamp[0].timestamp ?? '').toLocaleString()}
            >
              {timestampLabel}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {logsForTimestamp.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'group rounded-xl flex flex-row gap-2 items-start border',
                  'border-gray-200 bg-white p-3 shadow-sm mx-1 hover:bg-gray-50'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start gap-2">
                    <Badge rounded className={getLogTypeConfig({ type: entry.type }).badgeClass}>
                      {getLogTypeConfig({ type: entry.type }).label}
                    </Badge>
                    <pre className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word text-xs text-neutral-800">
                      {highlightText({
                        value: entry.message,
                        ranges: highlightById.get(entry.id) ?? [],
                        entryId: entry.id,
                        activeMatchId,
                      })}
                    </pre>
                  </div>
                </div>
                <Button
                  rounded
                  type="button"
                  variant="icon"
                  size="sm"
                  onClick={() => onCopyEntry(entry)}
                  className={cn(
                    'ml-auto self-start border border-neutral-300 bg-transparent text-neutral-500',
                    'opacity-0 transition-opacity group-hover:opacity-100',
                    'hover:bg-transparent hover:text-neutral-700'
                  )}
                  aria-label="Copy log message"
                  title="Copy log message"
                >
                  {copiedEntryId === entry.id ? (
                    <RiCheckLine className="size-4 text-green-600" />
                  ) : (
                    <RiFileCopyLine className="size-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LogsViewer({
  entries,
  streamError,
  isLoading,
  enabled,
  searchDisabled = false,
}: IProps) {
  const logsContentRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const hasSettledInitialScrollRef = useRef(false);
  const lastUserScrollIntentAtRef = useRef(0);
  const isScrollbarDragRef = useRef(false);
  const [searchScrollRequestId, setSearchScrollRequestId] = useState(0);
  const handledSearchScrollRequestRef = useRef(0);

  const { entries: searchedEntries, highlightById } = useLogSearch({
    entries,
    query,
  });
  const hasLogs = searchedEntries.length > 0;

  const groupedEntries = useMemo(() => {
    const groups = new Map<string | null, ILogEntry[]>();
    for (const entry of searchedEntries) {
      const existing = groups.get(entry.timestampGroupLabel) ?? [];
      existing.push(entry);
      groups.set(entry.timestampGroupLabel, existing);
    }
    return Array.from(groups.entries());
  }, [searchedEntries]);

  const matches = useMemo(() => {
    const ordered: IMatchLocation[] = [];
    for (const entry of searchedEntries) {
      const ranges = highlightById.get(entry.id) ?? [];
      for (const range of ranges) {
        ordered.push({
          entryId: entry.id,
          start: range.start,
          end: range.end,
          matchId: `${entry.id}-${range.start}-${range.end}`,
        });
      }
    }
    return ordered;
  }, [searchedEntries, highlightById]);

  const totalMatches = matches.length;
  const normalizedActiveMatchIndex =
    totalMatches === 0 ? 0 : Math.min(activeMatchIndex, totalMatches - 1);
  const activeMatch = totalMatches === 0 ? null : matches[normalizedActiveMatchIndex];
  const latestEntryId = searchedEntries.at(-1)?.id;

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nextIsScrollable = container.scrollHeight - container.clientHeight > 16;
    const nextIsAtBottom = !nextIsScrollable || remaining <= 16;
    setIsScrollable(nextIsScrollable);
    setIsAtBottom(nextIsAtBottom);
    setIsAtTop(container.scrollTop <= 16);
    return nextIsAtBottom;
  }, []);

  const forceScrollToBottom = useCallback(
    ({ behavior }: { behavior: ScrollBehavior }) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      setIsAtBottom(true);
      container.scrollTo({ top: container.scrollHeight, behavior });
      requestAnimationFrame(updateScrollState);
    },
    [updateScrollState]
  );

  const handleScroll = useCallback(() => {
    const nextIsAtBottom = updateScrollState();
    const hasRecentUserScrollIntent =
      isScrollbarDragRef.current ||
      performance.now() - lastUserScrollIntentAtRef.current < USER_SCROLL_INTENT_WINDOW_MS;
    if (hasRecentUserScrollIntent && typeof nextIsAtBottom === 'boolean') {
      shouldStickToBottomRef.current = nextIsAtBottom;
    }
  }, [updateScrollState]);

  const markUserScrollIntent = useCallback(() => {
    lastUserScrollIntentAtRef.current = performance.now();
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const scrollbarWidth = container.offsetWidth - container.clientWidth;
      if (scrollbarWidth <= 0) return;
      const containerRect = container.getBoundingClientRect();
      const isVerticalScrollbarPointer = event.clientX >= containerRect.right - scrollbarWidth - 2;
      if (!isVerticalScrollbarPointer) return;
      isScrollbarDragRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      markUserScrollIntent();
    },
    [markUserScrollIntent]
  );

  const handlePointerEnd = useCallback(() => {
    isScrollbarDragRef.current = false;
  }, []);

  // new logs follow the bottom only while the user's latest scroll position is the bottom.
  useEffect(() => {
    if (!latestEntryId) return;
    if (!shouldStickToBottomRef.current) return;

    requestAnimationFrame(() => {
      forceScrollToBottom({ behavior: 'auto' });
    });
  }, [latestEntryId, forceScrollToBottom]);

  // logs open at the bottom until the user or search navigation chooses a different position.
  useEffect(() => {
    if (!hasLogs) {
      hasSettledInitialScrollRef.current = false;
      shouldStickToBottomRef.current = true;
      return;
    }
    if (hasSettledInitialScrollRef.current) return;
    hasSettledInitialScrollRef.current = true;

    requestAnimationFrame(() => {
      forceScrollToBottom({ behavior: 'auto' });
    });
  }, [hasLogs, forceScrollToBottom]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let animationFrameId: number | null = null;

    const updateAfterLayout = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(() => {
        if (shouldStickToBottomRef.current) {
          forceScrollToBottom({ behavior: 'auto' });
          return;
        }
        updateScrollState();
      });
    };

    updateAfterLayout();

    if (!hasLogs) {
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }

    const resizeObserver = new ResizeObserver(updateAfterLayout);
    resizeObserver.observe(container);
    if (logsContentRef.current) {
      resizeObserver.observe(logsContentRef.current);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [forceScrollToBottom, hasLogs, updateScrollState]);

  useEffect(() => {
    if (searchScrollRequestId === handledSearchScrollRequestRef.current) return;
    handledSearchScrollRequestRef.current = searchScrollRequestId;
    shouldStickToBottomRef.current = false;
    setIsAtBottom(false);
    if (!activeMatch) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const target = container.querySelector(
      `[data-log-match-id="${activeMatch.matchId}"]`
    ) as HTMLElement | null;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    requestAnimationFrame(updateScrollState);
    const timeoutId = window.setTimeout(updateScrollState, 250);
    return () => window.clearTimeout(timeoutId);
  }, [activeMatch, searchScrollRequestId, updateScrollState]);

  const goToPreviousMatch = useCallback(() => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    setSearchScrollRequestId((prev) => prev + 1);
  }, [totalMatches]);

  const goToNextMatch = useCallback(() => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % totalMatches);
    setSearchScrollRequestId((prev) => prev + 1);
  }, [totalMatches]);

  const scrollToBottom = useCallback(() => {
    shouldStickToBottomRef.current = true;
    lastUserScrollIntentAtRef.current = 0;
    forceScrollToBottom({ behavior: 'smooth' });
  }, [forceScrollToBottom]);

  const scrollToTop = useCallback(() => {
    shouldStickToBottomRef.current = false;
    lastUserScrollIntentAtRef.current = performance.now();
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const copyEntry = useCallback(async (entry: ILogEntry) => {
    await navigator.clipboard.writeText(entry.message);
    setCopiedEntryId(entry.id);
    window.setTimeout(() => {
      setCopiedEntryId((current) => (current === entry.id ? null : current));
    }, 2000);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [updateScrollState]);

  if (!enabled) return null;

  return (
    <div id="job-logs" className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-50 pb-4">
      <div className="sticky top-0 z-10 bg-neutral-50">
        <LogsActions
          entries={entries}
          query={query}
          onQueryChange={({ query: nextQuery }) => {
            setQuery(nextQuery);
            setActiveMatchIndex(0);
            if (nextQuery.trim()) {
              setSearchScrollRequestId((prev) => prev + 1);
            }
          }}
          searchDisabled={searchDisabled}
          totalMatches={totalMatches}
          activeMatchIndex={normalizedActiveMatchIndex}
          onGoToPreviousMatch={goToPreviousMatch}
          onGoToNextMatch={goToNextMatch}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onWheel={(event) => {
            if (event.deltaY !== 0) markUserScrollIntent();
          }}
          onTouchMove={markUserScrollIntent}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="secondary-scrollbar absolute inset-0 overflow-x-hidden overflow-y-auto"
        >
          {!hasLogs && !streamError && isLoading && (
            <div className="w-full py-2">
              <LogsLoadingSkeleton />
            </div>
          )}
          {!hasLogs && !streamError && !isLoading && (
            <div className="w-full py-2">
              <LogsLoadingSkeleton />
            </div>
          )}

          {streamError && (
            <div className="w-full py-2 px-2">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-destructive">
                {streamError}
              </div>
            </div>
          )}

          {groupedEntries.length > 0 && (
            <div ref={logsContentRef} className="flex flex-col gap-4 mr-1 h-full">
              <LogsGroups
                groupedEntries={groupedEntries}
                highlightById={highlightById}
                activeMatchId={activeMatch?.matchId}
                onCopyEntry={copyEntry}
                copiedEntryId={copiedEntryId}
              />
              <div />
            </div>
          )}
        </div>
        {hasLogs && !isAtTop && (
          <Button
            type="button"
            variant="icon"
            size="sm"
            rounded
            onClick={scrollToTop}
            className={cn(
              'absolute top-2 right-4 z-10 backdrop-blur-md',
              'text-gray-500 opacity-60 transition-all hover:border bg-black/20',
              'hover:border-gray-400 hover:bg-primary-8 hover:text-white hover:opacity-100 hover:shadow-sm'
            )}
            aria-label="Scroll to top"
            title="Scroll to top"
          >
            <RiArrowUpLine className="size-4" />
          </Button>
        )}
        {hasLogs && isScrollable && !isAtBottom && (
          <Button
            type="button"
            variant="icon"
            size="sm"
            rounded
            onClick={scrollToBottom}
            className={cn(
              'absolute bottom-2 right-4 z-10 backdrop-blur-md',
              'text-gray-500 opacity-60 transition-all hover:border bg-black/20',
              'hover:border-gray-400 hover:bg-primary-8 hover:text-white hover:opacity-100 hover:shadow-sm'
            )}
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <RiArrowDownLine className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
