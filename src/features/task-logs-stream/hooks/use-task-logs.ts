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
import { resolveTaskLogsDataState } from '@/features/task-logs-stream/hooks/use-task-logs-state';
import {
  type IJobRead,
  type ITaskLogsDataState,
  JobStatusDict,
  type TLogLevel,
} from '@/features/task-logs-stream/types';

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

  // configuration is available from the read endpoint as soon as the job exists
  const configuration = readQuery.data ? extractConfiguration({ data: readQuery.data }) : null;

  // Read directly from the stream cache as well as the current observer.
  // This preserves live entries across page/tab remounts while the warmup
  // observer keeps the underlying streamed query alive.
  const cachedStreamData = jobId
    ? queryClient.getQueryData<unknown>([
        'task-logs-stream',
        { jobId, virtualLabId, projectId, configId },
      ])
    : undefined;
  const streamEntries = getStreamEntries({ data: streamQuery.data });
  const cachedStreamEntries = getStreamEntries({ data: cachedStreamData });
  const readHasTerminalStatus = isTerminalJobStatus({ status: readQuery.data?.status });
  const readEntries = readQuery.data
    ? parseJobReadLogsToEntries({
        logs: readQuery.data.logs ?? null,
      })
    : undefined;
  const streamErrorMessage = streamQuery.error instanceof Error ? streamQuery.error.message : null;
  const readErrorMessage = readQuery.error instanceof Error ? readQuery.error.message : null;

  useEffect(() => {
    if (!enabled || !jobId || skipStream) return;
    if (!hasStreamTerminated || readHasTerminalStatus) return;
    queryClient.invalidateQueries({
      queryKey: ['task-logs-stream', { jobId, virtualLabId, projectId, configId }],
    });
  }, [
    enabled,
    jobId,
    skipStream,
    hasStreamTerminated,
    readHasTerminalStatus,
    virtualLabId,
    projectId,
    configId,
    queryClient,
  ]);

  return resolveTaskLogsDataState({
    enabled,
    jobId,
    hasStreamTerminated,
    streamEntries,
    cachedStreamEntries,
    streamIsActive: streamQuery.fetchStatus === 'fetching',
    streamIsLoading: streamQuery.isLoading,
    readIsLoading: readQuery.isLoading,
    readEntries,
    readHasTerminalStatus,
    streamErrorMessage,
    readErrorMessage,
    configuration,
  });
}

function isTerminalJobStatus({ status }: { status?: string }) {
  return (
    status === JobStatusDict.Done ||
    status === JobStatusDict.Error ||
    status === JobStatusDict.Cancelled
  );
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
