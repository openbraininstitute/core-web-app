'use client';

import {
  queryOptions,
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { Badge } from '@/ui/molecules/badge';
import { log } from '@/utils/logger';

interface IRawStreamLog {
  message_type?: string;
  timestamp?: string;
  message?: string;
  status?: string;
  stdout?: string;
  stderr?: string;
}

interface ILogEntry {
  id: string;
  type: TLogTypeKey;
  timestamp?: string;
  message: string;
  timestampGroupLabel: string;
}

interface IProps {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  enableDebugLogs?: boolean;
}

interface ITaskLogsStreamState {
  entries: ILogEntry[];
  streamError: string | null;
  isLoading: boolean;
}

const LogTypeDict = {
  Stderr: {
    key: 'stderr',
    label: 'STDERR',
    badgeClass: 'bg-teal-600 text-white border-transparent',
  },
  Error: {
    key: 'error',
    label: 'ERROR',
    badgeClass: 'bg-red-600 text-white border-transparent',
  },
  Stdout: {
    key: 'stdout',
    label: 'STDOUT',
    badgeClass: 'bg-emerald-600 text-white border-transparent',
  },
  Status: {
    key: 'status',
    label: 'STATUS',
    badgeClass: 'bg-blue-600 text-white border-transparent',
  },
  Info: {
    key: 'info',
    label: 'INFO',
    badgeClass: 'bg-cyan-600 text-white border-transparent',
  },
  Warning: {
    key: 'warning',
    label: 'WARNING',
    badgeClass: 'bg-amber-500 text-white border-transparent',
  },
  Warn: {
    key: 'warn',
    label: 'WARN',
    badgeClass: 'bg-amber-500 text-white border-transparent',
  },
  Log: {
    key: 'log',
    label: 'LOG',
    badgeClass: 'bg-neutral-200 text-neutral-900 border-neutral-300',
  },
  Raw: {
    key: 'raw',
    label: 'RAW',
    badgeClass: 'bg-neutral-200 text-neutral-900 border-neutral-300',
  },
} as const;

type TLogTypeKey = (typeof LogTypeDict)[keyof typeof LogTypeDict]['key'];

const TLogTypeConfigMap: Record<TLogTypeKey, { label: string; badgeClass: string }> = Object.values(
  LogTypeDict
).reduce(
  (acc, value) => {
    acc[value.key] = { label: value.label, badgeClass: value.badgeClass };
    return acc;
  },
  {} as Record<TLogTypeKey, { label: string; badgeClass: string }>
);

function redactSensitive({ value }: { value: string }): string {
  return value
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]')
    .replace(
      /([?&](?:AWSAccessKeyId|Signature|X-Amz-Signature|x-amz-security-token|X-Amz-Security-Token|token|access_token|refresh_token|id_token|api_key|apikey|secret|password)=)[^&\s"]+/gi,
      '$1[REDACTED]'
    )
    .replace(
      /("?(?:token|accessToken|refreshToken|idToken|apiKey|api_key|secret|password|client_secret)"?\s*:\s*")([^"]+)(")/gi,
      '$1[REDACTED]$3'
    )
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_AWS_KEY]');
}

function formatTimestampGroupLabel({ timestamp }: { timestamp?: string }) {
  if (!timestamp) return 'Unknown timestamp';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown timestamp';
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'medium',
  }).format(date);
}

function normalizeToEntry({ rawLine, idx }: { rawLine: string; idx: number }): ILogEntry | null {
  if (!rawLine.trim()) return null;

  try {
    const payload = JSON.parse(rawLine) as IRawStreamLog;
    const message =
      payload.message ?? payload.stdout ?? payload.stderr ?? payload.status ?? rawLine;
    const rawType =
      payload.message_type ?? (payload.stderr ? 'stderr' : payload.stdout ? 'stdout' : 'log');
    const normalizedType = rawType.toLowerCase() as TLogTypeKey;
    const type: TLogTypeKey = TLogTypeConfigMap[normalizedType] ? normalizedType : 'raw';

    return {
      id: `${idx}-${payload.timestamp ?? ''}-${type}`,
      type,
      timestamp: payload.timestamp,
      message: redactSensitive({ value: String(message) }),
      timestampGroupLabel: formatTimestampGroupLabel({ timestamp: payload.timestamp }),
    };
  } catch {
    return {
      id: `${idx}`,
      type: 'raw',
      message: redactSensitive({ value: rawLine }),
      timestampGroupLabel: 'Unknown timestamp',
    };
  }
}

function getLogTypeConfig({ type }: { type: TLogTypeKey }) {
  return TLogTypeConfigMap[type] ?? TLogTypeConfigMap.raw;
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
    throw new Error(`Failed to stream logs: ${response.status}`);
  }

  return parseLogStreamToEntries({ stream: response.body });
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
  debugLog: (params: { level: 'info' | 'error'; message: string; payload?: unknown }) => void;
}): ITaskLogsStreamState {
  const query = useQuery(
    queryOptions({
      queryKey: [
        'task-logs-stream',
        { jobId, virtualLabId, projectId, configId, enableDebugLogs, enabled },
      ],
      queryFn: streamedQuery({
        streamFn: async (context) => {
          if (!jobId) {
            return (async function* empty() {})();
          }
          debugLog({
            level: 'info',
            message: '[build-logs] opening stream',
            payload: { configId, jobId },
          });
          return fetchTaskLogsStream({
            jobId,
            virtualLabId,
            projectId,
            enableDebugLogs,
            signal: context.signal,
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
      streamError: 'No job id available yet. Launch a build first.',
      isLoading: false,
    };
  }

  return {
    entries: Array.isArray(query.data) ? (query.data as ILogEntry[]) : [],
    streamError: query.error instanceof Error ? query.error.message : null,
    isLoading: query.isLoading,
  };
}

function LogsHeader({ jobId }: { jobId?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-primary-9">Logs</h3>
      {jobId && (
        <Badge variant="outline" className="text-neutral-700">
          {jobId.slice(0, 8)}...
        </Badge>
      )}
    </div>
  );
}

function LogsGroups({ groupedEntries }: { groupedEntries: Array<[string, ILogEntry[]]> }) {
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
                  {entry.message}
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
  const debugLog = useCallback(
    ({
      level,
      message,
      payload,
    }: {
      level: 'info' | 'error';
      message: string;
      payload?: unknown;
    }) => {
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

  const hasLogs = useMemo(() => entries.length > 0, [entries.length]);
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, ILogEntry[]>();
    for (const entry of entries) {
      const existing = groups.get(entry.timestampGroupLabel) ?? [];
      existing.push(entry);
      groups.set(entry.timestampGroupLabel, existing);
    }
    return Array.from(groups.entries());
  }, [entries]);
  const latestEntryId = entries.at(-1)?.id;

  useEffect(() => {
    if (!latestEntryId) return;
    requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, [latestEntryId]);

  if (!enabled) return null;

  return (
    <div className="h-full overflow-y-auto rounded-2xl bg-neutral-50 p-4">
      <LogsHeader jobId={jobId} />

      {!hasLogs && !streamError && isLoading && (
        <div className="text-sm text-neutral-500">Waiting for logs...</div>
      )}

      {streamError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {streamError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <LogsGroups groupedEntries={groupedEntries} />
        <div ref={bottomAnchorRef} />
      </div>
    </div>
  );
}
