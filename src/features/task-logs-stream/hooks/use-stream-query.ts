'use client';

import {
  queryOptions,
  experimental_streamedQuery as streamedQuery,
  useQuery,
} from '@tanstack/react-query';

import { streamTaskLogsWithReconnect } from '@/features/task-logs-stream/queries/stream';
import { emptyStream } from '@/utils/streamutils';

import type { ILogEntry, TLogLevel } from '@/features/task-logs-stream/types';

export interface IStreamQueryParams {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  debugLog: (params: { level: TLogLevel; message: string; payload?: unknown }) => void;
}

/**
 * builds the shared query options for a task logs stream
 * exposed so that both the active viewer (`useStreamQuery`)
 * and the parent-level warmup hook can observe the exact same cache entry
 * any subscriber keeps the underlying stream alive for every other subscriber
 */
export function buildTaskLogsStreamQueryOptions({
  jobId,
  virtualLabId,
  projectId,
  configId,
  enabled,
  debugLog,
}: IStreamQueryParams) {
  return queryOptions({
    queryKey: ['task-logs-stream', { jobId, virtualLabId, projectId, configId }],
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
          signal,
          debugLog: ({ level, message, payload }) => debugLog({ level, message, payload }),
          configId,
        });
      },
      refetchMode: 'append',
    }),
    enabled: enabled && Boolean(jobId),
    staleTime: Infinity,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
}

export function useStreamQuery(params: IStreamQueryParams) {
  return useQuery(buildTaskLogsStreamQueryOptions(params));
}

export function getStreamEntries({ data }: { data: unknown }): ILogEntry[] {
  return Array.isArray(data) ? (data as ILogEntry[]) : [];
}
