'use client';

import {
  queryOptions,
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query';

import { streamTaskLogsWithReconnect } from '@/features/task-logs-stream/queries/stream';
import { emptyStream } from '@/utils/streamutils';

import type { ILogEntry, TLogLevel } from '@/features/task-logs-stream/types';

export function useStreamQuery({
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
}) {
  return useQuery(
    queryOptions({
      queryKey: [
        'task-logs-stream',
        { jobId, virtualLabId, projectId, configId, enableDebugLogs, enabled },
      ],
      queryFn: streamedQuery({
        streamFn: async ({ signal }) => {
          if (!jobId) return emptyStream();
          debugLog({
            level: 'info',
            message: '[build-logs] opening stream',
            payload: { configId, jobId },
          });
          return streamTaskLogsWithReconnect({
            jobId,
            virtualLabId,
            projectId,
            enableDebugLogs,
            signal,
            debugLog: ({ level, message, payload }) => debugLog({ level, message, payload }),
            configId,
          });
        },
        refetchMode: 'append',
      }),
      enabled: enabled && Boolean(jobId) && !isViewCampaign,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    })
  );
}

export function getStreamEntries({ data }: { data: unknown }): ILogEntry[] {
  return Array.isArray(data) ? (data as ILogEntry[]) : [];
}
