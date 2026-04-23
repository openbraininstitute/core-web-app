import {
  type IHighlightRange,
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

export function formatTimestampGroupLabel({ timestamp }: { timestamp?: string }) {
  if (!timestamp) return 'Unknown timestamp';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown timestamp';
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
      timestampGroupLabel: 'Unknown timestamp',
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
