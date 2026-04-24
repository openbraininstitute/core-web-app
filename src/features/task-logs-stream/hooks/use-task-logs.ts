'use client';

import { useQueryClient } from '@tanstack/react-query';
import { pick } from 'es-toolkit/compat';
import { useEffect } from 'react';

import { parseJobReadLogsToEntries } from '@/features/task-logs-stream/helpers';
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
  skipStream = false,
  debugLog,
}: {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  /** skip the stream entirely and read the job directly (e.g. terminal execution status) */
  skipStream?: boolean;
  debugLog: (params: { level: TLogLevel; message: string; payload?: unknown }) => void;
}): ITaskLogsDataState {
  const queryClient = useQueryClient();

  const streamQuery = useStreamQuery({
    jobId,
    virtualLabId,
    projectId,
    configId,
    enabled: enabled && !skipStream,
    debugLog,
  });

  // read the job eagerly as soon as we have a jobId
  // this gives us configuration data while the stream is still running
  const readQuery = useReadQuery({
    jobId,
    virtualLabId,
    projectId,
    configId,
    enabled: enabled && Boolean(jobId),
  });

  // the stream is "terminated" once it is no longer actively fetching and has
  // reached a success (ended gracefully) or error terminal state,
  // or when we skipped it entirely because the execution is already terminal.
  const hasStreamTerminated =
    skipStream || (streamQuery.fetchStatus === 'idle' && streamQuery.status !== 'pending');

  // once the stream terminates, invalidate the read query to get the final
  // authoritative state (final logs, end_time, status, etc.)
  useEffect(() => {
    if (hasStreamTerminated && jobId) {
      queryClient.invalidateQueries({
        queryKey: ['task-job-read', { jobId, virtualLabId, projectId, configId }],
      });
    }
  }, [hasStreamTerminated, jobId, virtualLabId, projectId, configId, queryClient]);

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

  // configuration is available from the read endpoint as soon as the job exists
  const configuration = readQuery.data ? extractConfiguration({ data: readQuery.data }) : null;

  // once the stream has terminated and read data is available, prefer read logs
  // as the authoritative final state
  if (hasStreamTerminated && readQuery.data) {
    return {
      entries: parseJobReadLogsToEntries({ logs: readQuery.data.logs ?? null }),
      streamError: null,
      isLoading: false,
      configuration,
    };
  }

  const streamEntries = getStreamEntries({ data: streamQuery.data });

  // surface stream errors to the user.
  // 404 NOT_FOUND means the backend already retried internally — the stream genuinely doesn't exist.
  // 502 GENERIC_ERROR means the upstream returned an unexpected error.
  const streamErrorMessage = streamQuery.error instanceof Error ? streamQuery.error.message : null;
  const readErrorMessage = readQuery.error instanceof Error ? readQuery.error.message : null;

  return {
    entries: streamEntries,
    streamError: readErrorMessage ?? streamErrorMessage,
    isLoading: streamQuery.isLoading || readQuery.isLoading,
    configuration,
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
