'use client';

import { parseJobReadLogsToEntries } from '@/features/task-logs-stream/helpers';
import { useReadQuery } from '@/features/task-logs-stream/hooks/use-read-query';
import {
  getStreamEntries,
  useStreamQuery,
} from '@/features/task-logs-stream/hooks/use-stream-query';

import type { ITaskLogsDataState, TLogLevel } from '@/features/task-logs-stream/types';

export function useTaskLogsData({
  jobId,
  virtualLabId,
  projectId,
  configId,
  enabled,
  enableDebugLogs,
  isViewCampaign,
  debugLog,
}: {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  enableDebugLogs: boolean;
  isViewCampaign: boolean;
  debugLog: (params: { level: TLogLevel; message: string; payload?: unknown }) => void;
}): ITaskLogsDataState {
  const streamQuery = useStreamQuery({
    jobId,
    virtualLabId,
    projectId,
    configId,
    enabled,
    enableDebugLogs,
    isViewCampaign,
    debugLog,
  });

  const readQuery = useReadQuery({
    jobId,
    virtualLabId,
    projectId,
    configId,
    enabled,
    enableDebugLogs,
  });

  if (!enabled) {
    return { entries: [], streamError: null, isLoading: false, configuration: null };
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

  if (isViewCampaign) {
    return {
      entries: parseJobReadLogsToEntries({ logs: readQuery.data?.logs ?? null }),
      streamError: readQuery.error instanceof Error ? readQuery.error.message : null,
      isLoading: readQuery.isLoading,
      configuration: readQuery.data
        ? ({
            id: readQuery.data.id,
            creation_date: readQuery.data.creation_date,
            update_date: readQuery.data.update_date,
            project_id: readQuery.data.project_id,
            user_id: readQuery.data.user_id,
            status: readQuery.data.status,
            error_reason: readQuery.data.error_reason,
            start_time: readQuery.data.start_time,
            end_time: readQuery.data.end_time,
            inputs: readQuery.data.inputs,
            code: readQuery.data.code,
            resources: readQuery.data.resources,
            meta: readQuery.data.meta,
          } as const)
        : null,
    };
  }

  return {
    entries: getStreamEntries({ data: streamQuery.data }),
    streamError: streamQuery.error instanceof Error ? streamQuery.error.message : null,
    isLoading: streamQuery.isLoading,
    configuration: null,
  };
}
