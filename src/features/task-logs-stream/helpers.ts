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
      timestampGroupLabel: formatTimestampGroupLabel({ timestamp: payload.timestamp }),
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
  const deduped: ILogEntry[] = [];
  for (const entry of entries) {
    const fingerprint = `${entry.timestamp ?? 'no-ts'}|${entry.type}|${entry.message}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    deduped.push(entry);
  }
  return deduped;
}

export class StreamHttpError extends Error {
  status: number;

  constructor({ status }: { status: number }) {
    super(`We couldn't load live logs right now (HTTP ${status}). Please try again in a moment.`);
    this.name = 'StreamHttpError';
    this.status = status;
  }
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
        const entry = normalizeToEntry({ rawLine: JSON.stringify(record), idx: lineIndex });
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
    const entry = normalizeToEntry({ rawLine: `${prefix}${String(value)}`, idx: lineIndex });
    if (entry) entries.push(entry);
  };

  visit(logs, []);
  return entries;
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
        lineIndex += 1;
        const entry = normalizeToEntry({ rawLine: line, idx: lineIndex });
        if (entry) yield entry;
      }
    }

    if (buffer.trim()) {
      lineIndex += 1;
      const tail = normalizeToEntry({ rawLine: buffer, idx: lineIndex });
      if (tail) yield tail;
    }
  } finally {
    reader.releaseLock();
  }
}

export function isRetriableStreamError({ error }: { error: unknown }): boolean {
  if (error instanceof StreamHttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return error instanceof Error;
}

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
