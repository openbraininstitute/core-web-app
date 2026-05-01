'use client';

import { getSession } from '@/auth-fetch';
import { config } from '@/config';
import { StreamHttpError } from '@/features/task-logs-stream/helpers';

import type { IJobRead } from '@/features/task-logs-stream/types';

export async function fetchTaskJobRead({
  jobId,
  virtualLabId,
  projectId,
  signal,
}: {
  jobId: string;
  virtualLabId: string;
  projectId: string;
  signal?: AbortSignal;
}): Promise<IJobRead> {
  const session = await getSession();

  const response = await fetch(`${config.OBI_ONE_URL}/declared/task/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    cache: 'no-store',
    signal,
    headers: {
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      'virtual-lab-id': virtualLabId,
      'project-id': projectId,
    },
  });

  if (!response.ok) {
    throw new StreamHttpError({ status: response.status });
  }

  return (await response.json()) as IJobRead;
}
