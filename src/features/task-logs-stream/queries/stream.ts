'use client';

import {
  getReconnectDelayMs,
  isRetriableStreamError,
  parseLogStreamToEntries,
  StreamHttpError,
  waitForReconnect,
} from '@/features/task-logs-stream/helpers';

import type { ILogEntry } from '@/features/task-logs-stream/types';

export async function fetchTaskLogsStreamEndpoint({
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

export async function* streamTaskLogsWithReconnect({
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
      const stream = await fetchTaskLogsStreamEndpoint({
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
