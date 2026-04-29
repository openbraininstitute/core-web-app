'use client';

import { StreamHttpError } from '@/features/task-logs-stream/helpers';

import type { IJobRead } from '@/features/task-logs-stream/types';

export async function fetchTaskJobRead({
  jobId,
  virtualLabId,
  projectId,
  enableDebugLogs,
  signal,
}: {
  jobId: string;
  virtualLabId: string;
  projectId: string;
  enableDebugLogs: boolean;
  signal?: AbortSignal;
}): Promise<IJobRead> {
  const params = new URLSearchParams({
    virtualLabId,
    projectId,
    ...(enableDebugLogs ? { debugLogs: 'true' } : {}),
  });
  const response = await fetch(
    `/api/task-manager/job/${encodeURIComponent(jobId)}?${params.toString()}`,
    {
      method: 'GET',
      cache: 'no-store',
      signal,
    }
  );

  if (!response.ok) {
    throw new StreamHttpError({ status: response.status });
  }

  return (await response.json()) as IJobRead;
}
