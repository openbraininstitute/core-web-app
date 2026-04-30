'use client';

import { getSession } from '@/auth-fetch';
import { config } from '@/config';
import {
  getReconnectDelayMs,
  isRetryableStreamError,
  MAX_STREAM_RETRY_ATTEMPTS,
  parseLogStreamToEntries,
  StreamHttpError,
  waitForReconnect,
} from '@/features/task-logs-stream/helpers';

import type { ILogEntry } from '@/features/task-logs-stream/types';

export async function fetchTaskLogsStreamEndpoint({
  jobId,
  virtualLabId,
  projectId,
  signal,
}: {
  jobId: string;
  virtualLabId: string;
  projectId: string;
  signal?: AbortSignal;
}): Promise<AsyncIterable<ILogEntry>> {
  const session = await getSession();

  const response = await fetch(
    `${config.OBI_ONE_URL}/declared/task/${encodeURIComponent(jobId)}/stream`,
    {
      method: 'GET',
      cache: 'no-store',
      signal,
      headers: {
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        'virtual-lab-id': virtualLabId,
        'project-id': projectId,
      },
    }
  );

  if (!response.ok || !response.body) {
    const errorBody = await readStreamErrorBody({ response });
    throw new StreamHttpError({
      status: response.status,
      errorCode: errorBody?.error_code,
      serverMessage: errorBody?.message,
    });
  }

  return parseLogStreamToEntries({ stream: response.body });
}

async function readStreamErrorBody({
  response,
}: {
  response: Response;
}): Promise<{ error_code?: string; message?: string } | undefined> {
  try {
    const body = (await response.clone().json()) as {
      error_code?: unknown;
      message?: unknown;
    };
    return {
      error_code: typeof body?.error_code === 'string' ? body.error_code : undefined,
      message: typeof body?.message === 'string' ? body.message : undefined,
    };
  } catch {
    return undefined;
  }
}

export async function* streamTaskLogsWithReconnect({
  jobId,
  virtualLabId,
  projectId,
  signal,
  debugLog,
  configId,
}: {
  jobId: string;
  virtualLabId: string;
  projectId: string;
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
        signal,
      });
      retryAttempt = 0;
      for await (const entry of stream) {
        yield entry;
      }
      return;
    } catch (error) {
      if (signal?.aborted) return;
      if (!isRetryableStreamError({ error }) || retryAttempt >= MAX_STREAM_RETRY_ATTEMPTS) {
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
