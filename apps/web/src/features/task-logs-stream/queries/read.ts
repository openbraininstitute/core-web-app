'use client';

import { getSession } from '@/auth-fetch';
import { config } from '@/config';
import { StreamHttpError } from '@/features/task-logs-stream/helpers';

import type { IJobRead } from '@/features/task-logs-stream/types';
import type { WorkspaceContext } from '@/types/common';

export async function fetchTaskJobRead({
  jobId,
  workspace,
  signal,
}: {
  jobId: string;
  workspace: WorkspaceContext;
  signal?: AbortSignal;
}): Promise<IJobRead> {
  const session = await getSession();

  const response = await fetch(`${config.OBI_ONE_URL}/declared/task/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    cache: 'no-store',
    signal,
    headers: {
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      'virtual-lab-id': workspace.virtualLabId,
      'project-id': workspace.projectId,
    },
  });

  if (!response.ok) {
    throw new StreamHttpError({ status: response.status });
  }

  return (await response.json()) as IJobRead;
}
