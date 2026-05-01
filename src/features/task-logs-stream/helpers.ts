import {
  type IHighlightRange,
  type IJobRead,
  type ILogEntry,
  type IRawStreamLog,
  LogTypeDict,
  type TLogTypeKey,
} from '@/features/task-logs-stream/types';

export const TLogTypeConfigMap: Record<TLogTypeKey, { label: string; badgeClass: string }> =
  Object.values(LogTypeDict).reduce(
    (acc, value) => {
      acc[value.key] = { label: value.label, badgeClass: value.badgeClass };
      return acc;
    },
    {} as Record<TLogTypeKey, { label: string; badgeClass: string }>
  );

export function redactSensitive({ value }: { value: string }): string {
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

export function formatTimestampGroupLabel({ timestamp }: { timestamp?: string }): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'medium',
  }).format(date);
}

export function normalizeToEntry({
  rawLine,
  idx,
}: {
  rawLine: string;
  idx: number;
}): ILogEntry | null {
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
      timestampGroupLabel: formatTimestampGroupLabel({
        timestamp: payload.timestamp,
      }),
    };
  } catch {
    return {
      id: `${idx}`,
      type: 'raw',
      message: redactSensitive({ value: rawLine }),
      timestampGroupLabel: null,
    };
  }
}

export function getLogTypeConfig({ type }: { type: TLogTypeKey }) {
  return TLogTypeConfigMap[type] ?? TLogTypeConfigMap.raw;
}

export function dedupeRanges({ ranges }: { ranges: IHighlightRange[] }) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: IHighlightRange[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (!last || range.start > last.end + 1) {
      merged.push(range);
      continue;
    }
    last.end = Math.max(last.end, range.end);
  }
  return merged;
}

export function dedupeLogEntries({ entries }: { entries: ILogEntry[] }) {
  const seen = new Set<string>();
  let deduped: ILogEntry[] | null = null;
  for (const [index, entry] of entries.entries()) {
    if (seen.has(entry.id)) {
      deduped ??= entries.slice(0, index);
      continue;
    }
    seen.add(entry.id);
    if (deduped) {
      deduped.push(entry);
    }
  }
  return deduped ?? entries;
}

export const STREAM_NOT_FOUND_ERROR_CODE = 'NOT_FOUND';
export const STREAM_GENERIC_ERROR_CODE = 'GENERIC_ERROR';

export class StreamHttpError extends Error {
  status: number;
  errorCode?: string;

  constructor({
    status,
    errorCode,
    serverMessage,
  }: {
    status: number;
    errorCode?: string;
    serverMessage?: string;
  }) {
    const fallback = `We couldn't load live logs right now (HTTP ${status}). Please try again in a moment.`;
    super(serverMessage ?? fallback);
    this.name = 'StreamHttpError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

/**
 * 404 NOT_FOUND — the backend already retried internally for ~10s.
 * The stream genuinely doesn't exist; don't retry further.
 */
export function isStreamNotFoundError({ error }: { error: unknown }): boolean {
  return (
    error instanceof StreamHttpError &&
    error.status === 404 &&
    error.errorCode === STREAM_NOT_FOUND_ERROR_CODE
  );
}

/**
 * 502 GENERIC_ERROR — upstream launch-system returned an unexpected error.
 * The frontend can retry a few times with backoff.
 */
export function isStreamGenericError({ error }: { error: unknown }): boolean {
  return (
    error instanceof StreamHttpError &&
    error.status === 502 &&
    error.errorCode === STREAM_GENERIC_ERROR_CODE
  );
}

export function formatConfigurationValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function parseJobReadLogsToEntries({ logs }: { logs: IJobRead['logs'] }): ILogEntry[] {
  if (!logs) return [];
  const entries: ILogEntry[] = [];
  let lineIndex = 0;

  const visit = (value: unknown, keyPath: string[]) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        visit(item, [...keyPath, String(index)]);
      });
      return;
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const objectKeys = Object.keys(record);
      if (
        objectKeys.includes('message') ||
        objectKeys.includes('stdout') ||
        objectKeys.includes('stderr') ||
        objectKeys.includes('status')
      ) {
        lineIndex += 1;
        const entry = normalizeToEntry({
          rawLine: JSON.stringify(record),
          idx: lineIndex,
        });
        if (entry) entries.push(entry);
        return;
      }
      Object.entries(record).forEach(([key, nested]) => {
        visit(nested, [...keyPath, key]);
      });
      return;
    }

    lineIndex += 1;
    const prefix = keyPath.length > 0 ? `[${keyPath.join('.')}] ` : '';
    const entry = normalizeToEntry({
      rawLine: `${prefix}${String(value)}`,
      idx: lineIndex,
    });
    if (entry) entries.push(entry);
  };

  visit(logs.stream, []);
  return entries;
}

const STREAM_STOP_SENTINEL = '__STOP__';

function isStopSentinel({ rawLine }: { rawLine: string }): boolean {
  try {
    const payload = JSON.parse(rawLine) as Record<string, unknown>;
    return (
      payload.message_type === STREAM_STOP_SENTINEL || payload.message === STREAM_STOP_SENTINEL
    );
  } catch {
    return rawLine.trim() === STREAM_STOP_SENTINEL;
  }
}

export async function* parseLogStreamToEntries({
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
        if (isStopSentinel({ rawLine: line })) return;
        lineIndex += 1;
        const entry = normalizeToEntry({ rawLine: line, idx: lineIndex });
        if (entry) yield entry;
      }
    }

    if (buffer.trim()) {
      if (!isStopSentinel({ rawLine: buffer })) {
        lineIndex += 1;
        const tail = normalizeToEntry({ rawLine: buffer, idx: lineIndex });
        if (tail) yield tail;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * determines whether a stream error is worth retrying
 *
 * - 404 NOT_FOUND: backend already retried internally (~10s), don't retry
 * - 401/403: auth errors, don't retry
 * - 502 GENERIC_ERROR: upstream hiccup, retry with backoff
 * - 408/429/5xx (other): transient, retry with backoff
 * - network errors (no status): retry
 */
export function isRetryableStreamError({ error }: { error: unknown }): boolean {
  if (error instanceof StreamHttpError) {
    if (error.status === 404) return false;
    if (error.status === 401 || error.status === 403) return false;
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  // network-level errors (fetch failed, connection reset, etc.)
  return error instanceof Error;
}

export const MAX_STREAM_RETRY_ATTEMPTS = 5;

export function getReconnectDelayMs({ attempt }: { attempt: number }): number {
  const baseDelayMs = 1_000;
  const maxDelayMs = 30_000;
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitterMultiplier = 0.75 + Math.random() * 0.5;
  return Math.round(exponentialDelay * jitterMultiplier);
}

export function waitForReconnect({
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

export function toTxt({ entries }: { entries: ILogEntry[] }) {
  return entries
    .map((entry) => {
      const timestampPrefix = entry.timestampGroupLabel ? `${entry.timestampGroupLabel} ` : '';
      return `${timestampPrefix}[${entry.type.toUpperCase()}] ${entry.message.replaceAll('\n', ' ')}`;
    })
    .join('\n');
}

export function toJson({ entries }: { entries: ILogEntry[] }) {
  return JSON.stringify(entries, null, 2);
}

export async function copyToClipboard({ text }: { text: string }) {
  await navigator.clipboard.writeText(text);
}

export function downloadAsFile({
  filename,
  content,
  mimeType,
}: {
  filename: string;
  content: string;
  mimeType: string;
}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
