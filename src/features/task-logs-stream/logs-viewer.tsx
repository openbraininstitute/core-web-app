'use client';

import {
  queryOptions,
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  dedupeRanges,
  getLogTypeConfig,
  normalizeToEntry,
} from '@/features/task-logs-stream/helpers';
import { LogsActions } from '@/features/task-logs-stream/logs-actions';
import { Badge } from '@/ui/molecules/badge';
import { Skeleton } from '@/ui/molecules/skeleton';
import { log } from '@/utils/logger';
import { emptyStream } from '@/utils/streamutils';

import type { ReactNode } from 'react';
import type {
  IHighlightRange,
  ILogEntry,
  IMatchLocation,
  ISearchResult,
  ITaskLogsStreamState,
  TLogLevel,
} from '@/features/task-logs-stream/types';

interface IProps {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  enableDebugLogs?: boolean;
}

class StreamHttpError extends Error {
  status: number;

  constructor({ status }: { status: number }) {
    super(`Failed to stream logs: ${status}`);
    this.name = 'StreamHttpError';
    this.status = status;
  }
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

function useLogSearch({ entries, query }: { entries: ILogEntry[]; query: string }): ISearchResult {
  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || entries.length === 0) {
      return { entries, highlightById: new Map<string, IHighlightRange[]>() };
    }
    const tokens = trimmed
      .split(/\s+/)
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.length === 0) {
      return { entries, highlightById: new Map<string, IHighlightRange[]>() };
    }

    const fuse = new Fuse(entries, {
      keys: ['message'],
      includeMatches: true,
      includeScore: false,
      shouldSort: false,
      threshold: 0.3,
      ignoreLocation: true,
      useExtendedSearch: true,
    });

    const highlightById = new Map<string, IHighlightRange[]>();
    for (const token of tokens) {
      const safeToken = token.replaceAll("'", "\\'");
      let tokenResults: ReturnType<typeof fuse.search> = [];
      try {
        tokenResults = fuse.search(`'${safeToken}`);
      } catch {
        tokenResults = [];
      }
      for (const result of tokenResults) {
        const rawRanges = highlightById.get(result.item.id) ?? [];
        for (const match of result.matches ?? []) {
          if (match.key !== 'message') continue;
          for (const [start, end] of match.indices ?? []) {
            rawRanges.push({ start, end });
          }
        }
        highlightById.set(result.item.id, rawRanges);
      }
    }
    for (const entry of entries) {
      const ranges = highlightById.get(entry.id);
      if (!ranges) continue;
      highlightById.set(entry.id, dedupeRanges({ ranges }));
    }

    return { entries, highlightById };
  }, [entries, query]);
}

async function* parseLogStreamToEntries({
  stream,
}: {
  stream: ReadableStream<Uint8Array>;
}): AsyncGenerator<ILogEntry, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lineIndex = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        lineIndex += 1;
        const entry = normalizeToEntry({ rawLine: line, idx: lineIndex });
        if (entry) {
          yield entry;
        }
      }
    }

    if (buffer.trim()) {
      lineIndex += 1;
      const tail = normalizeToEntry({ rawLine: buffer, idx: lineIndex });
      if (tail) {
        yield tail;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function fetchTaskLogsStream({
  jobId,
  virtualLabId,
  projectId,
  enableDebugLogs,
  signal,
}: {
  jobId: string;
  virtualLabId: string;
  projectId: string;
  enableDebugLogs: boolean;
  signal?: AbortSignal;
}): Promise<AsyncIterable<ILogEntry>> {
  const params = new URLSearchParams({
    jobId,
    virtualLabId,
    projectId,
    ...(enableDebugLogs ? { debugLogs: 'true' } : {}),
  });

  const response = await fetch(`/api/task-manager/job/stream?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });

  if (!response.ok || !response.body) {
    throw new StreamHttpError({ status: response.status });
  }

  return parseLogStreamToEntries({ stream: response.body });
}

function isRetriableStreamError({ error }: { error: unknown }): boolean {
  if (error instanceof StreamHttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return error instanceof Error;
}

function getReconnectDelayMs({ attempt }: { attempt: number }): number {
  const baseDelayMs = 1_000;
  const maxDelayMs = 30_000;
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitterMultiplier = 0.75 + Math.random() * 0.5;
  return Math.round(exponentialDelay * jitterMultiplier);
}

function waitForReconnect({
  signal,
  delayMs,
}: {
  signal?: AbortSignal;
  delayMs: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);
    const onAbort = () => {
      cleanup();
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort);
  });
}

async function* streamTaskLogsWithReconnect({
  jobId,
  virtualLabId,
  projectId,
  enableDebugLogs,
  signal,
  debugLog,
  configId,
}: {
  jobId: string;
  virtualLabId: string;
  projectId: string;
  enableDebugLogs: boolean;
  signal?: AbortSignal;
  debugLog: (params: { level: 'info' | 'error'; message: string; payload?: unknown }) => void;
  configId?: string;
}): AsyncGenerator<ILogEntry> {
  let retryAttempt = 0;
  while (true) {
    if (signal?.aborted) return;
    try {
      const stream = await fetchTaskLogsStream({
        jobId,
        virtualLabId,
        projectId,
        enableDebugLogs,
        signal,
      });
      retryAttempt = 0;
      for await (const entry of stream) {
        yield entry;
      }
      return;
    } catch (error) {
      if (signal?.aborted) return;
      if (!isRetriableStreamError({ error })) {
        throw error;
      }
      const delayMs = getReconnectDelayMs({ attempt: retryAttempt });
      debugLog({
        level: 'error',
        message: '[build-logs] stream disconnected, retrying',
        payload: { configId, jobId, retryAttempt, delayMs, error },
      });
      retryAttempt += 1;
      await waitForReconnect({ signal, delayMs });
    }
  }
}

function useTaskLogsStream({
  jobId,
  virtualLabId,
  projectId,
  configId,
  enabled,
  enableDebugLogs,
  debugLog,
}: {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  enableDebugLogs: boolean;
  debugLog: (params: { level: TLogLevel; message: string; payload?: unknown }) => void;
}): ITaskLogsStreamState {
  const query = useQuery(
    queryOptions({
      queryKey: [
        'task-logs-stream',
        { jobId, virtualLabId, projectId, configId, enableDebugLogs, enabled },
      ],
      queryFn: streamedQuery({
        streamFn: async (context) => {
          if (!jobId) return emptyStream();
          debugLog({
            level: 'info',
            message: '[build-logs] opening stream',
            payload: { configId, jobId },
          });
          return streamTaskLogsWithReconnect({
            jobId,
            virtualLabId,
            projectId,
            enableDebugLogs,
            signal: context.signal,
            debugLog,
            configId,
          });
        },
        refetchMode: 'reset',
      }),
      enabled: enabled && Boolean(jobId),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    })
  );

  useEffect(() => {
    if (!query.error) return;
    debugLog({
      level: 'error',
      message: '[build-logs] stream failed',
      payload: { configId, jobId, error: query.error },
    });
  }, [configId, debugLog, jobId, query.error]);

  if (!enabled) {
    return { entries: [], streamError: null, isLoading: false };
  }
  if (!jobId) {
    return {
      entries: [],
      streamError:
        'No logs are available yet because this task has not been launched. Start the task first, then reopen Logs to stream live output, status updates, and execution details as they are produced.',
      isLoading: false,
    };
  }

  return {
    entries: Array.isArray(query.data) ? (query.data as ILogEntry[]) : [],
    streamError: query.error instanceof Error ? query.error.message : null,
    isLoading: query.isLoading,
  };
}

function LogsGroups({
  groupedEntries,
  highlightById,
  activeMatchId,
}: {
  groupedEntries: Array<[string, ILogEntry[]]>;
  highlightById: Map<string, IHighlightRange[]>;
  activeMatchId?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groupedEntries.map(([timestampLabel, logsForTimestamp]) => (
        <div key={timestampLabel}>
          <div className="mb-2 text-sm font-semibold text-neutral-600">{timestampLabel}</div>
          <div className="flex flex-col gap-2">
            {logsForTimestamp.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Badge className={getLogTypeConfig({ type: entry.type }).badgeClass}>
                    {getLogTypeConfig({ type: entry.type }).label}
                  </Badge>
                </div>
                <pre className="whitespace-pre-wrap wrap-break-word text-xs text-neutral-800">
                  {highlightText({
                    value: entry.message,
                    ranges: highlightById.get(entry.id) ?? [],
                    entryId: entry.id,
                    activeMatchId,
                  })}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LogsViewer({
  jobId,
  virtualLabId,
  projectId,
  configId,
  enabled,
  enableDebugLogs = false,
}: IProps) {
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const debugLog = useCallback(
    ({ level, message, payload }: { level: TLogLevel; message: string; payload?: unknown }) => {
      if (!enableDebugLogs) return;
      log(level, message, payload);
    },
    [enableDebugLogs]
  );

  const { entries, streamError, isLoading } = useTaskLogsStream({
    jobId,
    virtualLabId,
    projectId,
    configId,
    enabled,
    enableDebugLogs,
    debugLog,
  });

  const { entries: searchedEntries, highlightById } = useLogSearch({
    entries,
    query,
  });
  const hasLogs = searchedEntries.length > 0;
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, ILogEntry[]>();
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

  useEffect(() => {
    if (!latestEntryId) return;
    if (query.trim()) return;
    requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [latestEntryId, query]);

  useEffect(() => {
    if (totalMatches === 0) return;
    if (activeMatchIndex <= totalMatches - 1) return;
    setActiveMatchIndex(totalMatches - 1);
  }, [activeMatchIndex, totalMatches]);

  useEffect(() => {
    if (!activeMatch) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const target = container.querySelector(
      `[data-log-match-id="${activeMatch.matchId}"]`
    ) as HTMLElement | null;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeMatch]);

  const goToPreviousMatch = useCallback(() => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  }, [totalMatches]);

  const goToNextMatch = useCallback(() => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % totalMatches);
  }, [totalMatches]);

  if (!enabled) return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-neutral-50 p-4">
      <div className="sticky top-0 z-10 bg-neutral-50">
        <LogsActions
          entries={entries}
          query={query}
          onQueryChange={({ query: nextQuery }) => {
            setQuery(nextQuery);
            setActiveMatchIndex(0);
          }}
          searchDisabled={!jobId}
          totalMatches={totalMatches}
          activeMatchIndex={normalizedActiveMatchIndex}
          onGoToPreviousMatch={goToPreviousMatch}
          onGoToNextMatch={goToNextMatch}
        />
      </div>

      <div ref={scrollContainerRef} className="secondary-scrollbar min-h-0 flex-1 overflow-y-auto">
        {!hasLogs && !streamError && isLoading && (
          <div className="flex flex-col gap-3 pr-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <Skeleton className="mb-2 h-3 w-11/12" />
              <Skeleton className="h-3 w-8/12" />
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="mb-2 h-3 w-10/12" />
              <Skeleton className="h-3 w-9/12" />
            </div>
          </div>
        )}
        {!hasLogs && !streamError && !isLoading && (
          <div className="text-sm text-neutral-500">No logs yet.</div>
        )}

        {streamError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {streamError}
          </div>
        )}

        <div className="flex flex-col gap-4 pr-2">
          <LogsGroups
            groupedEntries={groupedEntries}
            highlightById={highlightById}
            activeMatchId={activeMatch?.matchId}
          />
          <div ref={bottomAnchorRef} />
        </div>
      </div>
    </div>
  );
}
