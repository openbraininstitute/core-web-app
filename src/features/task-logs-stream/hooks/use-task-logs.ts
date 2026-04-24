'use client';

import { pick } from 'es-toolkit/compat';

import {
  isStreamNotFoundError,
  parseJobReadLogsToEntries,
} from '@/features/task-logs-stream/helpers';
import { useReadQuery } from '@/features/task-logs-stream/hooks/use-read-query';
import {
  getStreamEntries,
  useStreamQuery,
} from '@/features/task-logs-stream/hooks/use-stream-query';

import type { IJobRead, ITaskLogsDataState, TLogLevel } from '@/features/task-logs-stream/types';

export function useTaskLogsData({
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
}): ITaskLogsDataState {
  const streamQuery = useStreamQuery({
    jobId,
    virtualLabId,
    projectId,
    configId,
    enabled,
    enableDebugLogs,
    debugLog,
  });

  // the stream is "terminated" once it is no longer actively fetching and has
  // reached a success (ended gracefully) or error (404 STREAM_NOT_FOUND)
  // terminal state. that's our cue to pull the authoritative read payload.
  const hasStreamTerminated =
    streamQuery.fetchStatus === 'idle' && streamQuery.status !== 'pending';

  const readQuery = useReadQuery({
    jobId,
    virtualLabId,
    projectId,
    configId,
    enabled: enabled && hasStreamTerminated,
    enableDebugLogs,
  });

  if (!enabled) {
    return {
      entries: [],
      streamError: null,
      isLoading: false,
      configuration: null,
    };
  }

  if (!jobId) {
    return {
      entries: [],
      streamError:
        'No logs are available yet because this task has not been launched. Start the task first, then reopen Logs to stream live output, status updates, and execution details as they are produced.',
      isLoading: false,
      configuration: null,
    };
  }

  // once the read payload is available, prefer it
  // it is the final state and also unlocks the configuration tab.
  if (readQuery.data) {
    return {
      entries: parseJobReadLogsToEntries({ logs: readQuery.data.logs ?? null }),
      streamError: null,
      isLoading: false,
      configuration: extractConfiguration({ data: readQuery.data }),
    };
  }

  const streamEntries = getStreamEntries({ data: streamQuery.data });

  // a 404 STREAM_NOT_FOUND is expected when there is no active stream
  // it is the signal to fall back to read, not something to surface to the user.
  const streamNotFound = isStreamNotFoundError({ error: streamQuery.error });
  const streamErrorMessage =
    !streamNotFound && streamQuery.error instanceof Error ? streamQuery.error.message : null;
  const readErrorMessage = readQuery.error instanceof Error ? readQuery.error.message : null;

  return {
    entries: streamEntries,
    streamError: readErrorMessage ?? streamErrorMessage,
    isLoading: streamQuery.isLoading || readQuery.isLoading,
    configuration: null,
  };
}

function extractConfiguration({ data }: { data: IJobRead }): Omit<IJobRead, 'logs'> {
  return pick(data, [
    'id',
    'creation_date',
    'update_date',
    'project_id',
    'user_id',
    'status',
    'error_reason',
    'start_time',
    'end_time',
    'inputs',
    'code',
    'resources',
    'meta',
  ]);
}
