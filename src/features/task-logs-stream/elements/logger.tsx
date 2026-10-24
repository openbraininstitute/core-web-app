'use client';

import {
  RiArrowDownLine,
  RiArrowDownSLine,
  RiArrowUpLine,
  RiCheckLine,
  RiFileCopyLine,
} from '@remixicon/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LogsActions } from '@/features/task-logs-stream/elements/actions';
import { LogsLoadingSkeleton } from '@/features/task-logs-stream/elements/skeleton';
import { getLogTypeConfig } from '@/features/task-logs-stream/helpers';
import { useLogSearch } from '@/features/task-logs-stream/hooks/use-log-search';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { PointerEvent, ReactNode } from 'react';
import type {
  IHighlightRange,
  ILogEntry,
  IMatchLocation,
  TLogTypeKey,
} from '@/features/task-logs-stream/types';

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

/** Lines of one type in a row, read as one block until the type changes. */
type LogRun = { type: TLogTypeKey; entries: ILogEntry[] };

function runsOf(entries: ILogEntry[]): LogRun[] {
  const runs: LogRun[] = [];
  for (const entry of entries) {
    const last = runs.at(-1);
    if (last?.type === entry.type) last.entries.push(entry);
    else runs.push({ type: entry.type, entries: [entry] });
  }
  return runs;
}

function CopyButton({
  copied,
  label,
  onClick,
  className,
}: {
  copied: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded text-neutral-400 transition-opacity',
        'opacity-0 hover:bg-gray-100 hover:text-neutral-700 focus-visible:opacity-100',
        className
      )}
    >
      {copied ? (
        <RiCheckLine className="size-3.5 text-green-600" />
      ) : (
        <RiFileCopyLine className="size-3.5" />
      )}
    </button>
  );
}

/**
 * Each run of one type as one block: its badge, span and line count over its
 * lines - held in view while they scroll, and folding them away on a click -
 * with the time in a gutter wherever it moves on. A folded block opens while
 * it holds the search match on show.
 */
function LogRuns({
  runs,
  highlightById,
  activeMatchId,
  activeEntryId,
  collapsed,
  onToggle,
  onCopy,
  copiedId,
}: {
  runs: LogRun[];
  highlightById: Map<string, IHighlightRange[]>;
  activeMatchId?: string;
  activeEntryId?: string;
  collapsed: ReadonlySet<string>;
  onToggle: (runId: string) => void;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      {runs.map((run) => {
        const config = getLogTypeConfig({ type: run.type });
        const first = run.entries[0];
        const from = first.timestampGroupLabel;
        const to = run.entries[run.entries.length - 1].timestampGroupLabel;
        const runId = `run-${first.id}`;
        const open =
          !collapsed.has(runId) || run.entries.some((entry) => entry.id === activeEntryId);
        return (
          <section
            key={runId}
            className="mx-1 rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div
              className={cn(
                'group/run sticky top-0 z-1 flex items-center gap-2 bg-white px-3 py-2',
                open ? 'rounded-t-xl border-b border-gray-100' : 'rounded-xl'
              )}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onToggle(runId)}
                title={open ? 'Fold these lines away' : 'Show these lines'}
                className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
              >
                <RiArrowDownSLine
                  className={cn(
                    'size-4 shrink-0 text-gray-400 transition-transform',
                    !open && '-rotate-90'
                  )}
                />
                <Badge rounded className={config.badgeClass}>
                  {config.label}
                </Badge>
                {from && (
                  <span className="text-xs text-gray-500 tabular-nums">
                    {to && to !== from ? `${from} – ${to}` : from}
                  </span>
                )}
                {run.entries.length > 1 && (
                  <span className="text-xs text-gray-400">{run.entries.length} lines</span>
                )}
              </button>
              <CopyButton
                copied={copiedId === runId}
                label="Copy these lines"
                onClick={() => onCopy(runId, run.entries.map((e) => e.message).join('\n'))}
                className="group-hover/run:opacity-100"
              />
            </div>
            {open && (
              <div className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 py-1.5">
                {run.entries.map((entry, i) => {
                  const marker =
                    i === 0 || entry.timestampGroupLabel !== run.entries[i - 1].timestampGroupLabel
                      ? entry.timestampGroupLabel
                      : null;
                  return (
                    <div
                      key={entry.id}
                      className="group/line relative col-span-2 grid grid-cols-subgrid px-3 hover:bg-gray-50"
                    >
                      <span
                        className="text-[10px] leading-5 text-gray-400 tabular-nums"
                        title={
                          marker && entry.timestamp
                            ? new Date(entry.timestamp).toLocaleString()
                            : undefined
                        }
                      >
                        {marker}
                      </span>
                      <pre className="min-w-0 whitespace-pre-wrap wrap-break-word pr-6 text-xs leading-5 text-neutral-800">
                        {highlightText({
                          value: entry.message,
                          ranges: highlightById.get(entry.id) ?? [],
                          entryId: entry.id,
                          activeMatchId,
                        })}
                      </pre>
                      <CopyButton
                        copied={copiedId === entry.id}
                        label="Copy log message"
                        onClick={() => onCopy(entry.id, entry.message)}
                        className="absolute top-0 right-2 group-hover/line:opacity-100"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedRuns, setCollapsedRuns] = useState<ReadonlySet<string>>(() => new Set());
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

  const runs = useMemo(() => runsOf(searchedEntries), [searchedEntries]);

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

  const toggleRun = useCallback((runId: string) => {
    setCollapsedRuns((current) => {
      const next = new Set(current);
      if (!next.delete(runId)) next.add(runId);
      return next;
    });
  }, []);

  const copyText = useCallback(async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
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

          {runs.length > 0 && (
            <div ref={logsContentRef} className="flex flex-col gap-4 mr-1 h-full">
              <LogRuns
                runs={runs}
                highlightById={highlightById}
                activeMatchId={activeMatch?.matchId}
                activeEntryId={activeMatch?.entryId}
                collapsed={collapsedRuns}
                onToggle={toggleRun}
                onCopy={copyText}
                copiedId={copiedId}
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
