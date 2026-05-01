'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';

import { fetchTaskJobRead } from '@/features/task-logs-stream/queries/read';

export function useReadQuery({
  jobId,
  virtualLabId,
  projectId,
  configId,
  enabled,
}: {
  jobId?: string;
  virtualLabId: string;
  projectId: string;
  configId?: string;
  enabled: boolean;
}) {
  return useQuery(
    queryOptions({
      queryKey: ['task-job-read', { jobId, virtualLabId, projectId, configId }],
      queryFn: ({ signal }) =>
        fetchTaskJobRead({
          jobId: jobId ?? '',
          virtualLabId,
          projectId,
          signal,
        }),
      enabled: enabled && Boolean(jobId),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })
  );
}
