'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';

import { fetchTaskJobRead } from '@/features/task-logs-stream/queries/read';

import type { WorkspaceContext } from '@/types/common';

export function useReadQuery({
  jobId,
  workspace,
  configId,
  enabled,
}: {
  jobId?: string;
  workspace: WorkspaceContext;
  configId?: string;
  enabled: boolean;
}) {
  return useQuery(
    queryOptions({
      queryKey: ['task-job-read', { jobId, configId, workspace }],
      queryFn: ({ signal }) =>
        fetchTaskJobRead({
          jobId: jobId ?? '',
          workspace,
          signal,
        }),
      enabled: enabled && Boolean(jobId),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })
  );
}
