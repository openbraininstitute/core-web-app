'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';

import { fetchTaskJobRead } from '@/features/task-logs-stream/queries/read';

export function useReadQuery({
  jobId,
  virtualLabId,
  projectId,
  configId,
  enabled,
  enableDebugLogs,
}: {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
  enableDebugLogs: boolean;
}) {
  return useQuery(
    queryOptions({
      queryKey: [
        'task-job-read',
        { jobId, virtualLabId, projectId, configId, enableDebugLogs, enabled },
      ],
      queryFn: ({ signal }) =>
        fetchTaskJobRead({
          jobId: jobId ?? '',
          virtualLabId,
          projectId,
          enableDebugLogs,
          signal,
        }),
      enabled: enabled && Boolean(jobId),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    })
  );
}
