'use client';

import { useQueries } from '@tanstack/react-query';

import { buildTaskLogsStreamQueryOptions } from '@/features/task-logs-stream/hooks/use-stream-query';

import type { TLogLevel } from '@/features/task-logs-stream/types';
import type { WorkspaceContext } from '@/types/common';

export interface ITaskLogsStreamWarmupJob {
  jobId: string;
  configId?: string;
}

/**
 * keeps a set of task-log streams "warm" by attaching a long-lived React Query
 * observer to each one. As long as the component that calls this hook stays
 * mounted, every listed stream keeps its observer count at ≥ 1 , which means
 * React Query will not cancel the in-flight streaming generator when an
 * individual `Viewer` unmounts or switches to a different `jobId`
 *
 * this unlocks two use cases:
 *   1. Switching browser/layout tabs that temporarily hide the `Viewer` does
 *      not drop the stream - the warmup observer at a parent level keeps it
 *      subscribed.
 *   2. when several configs are launched in parallel, each one's logs keep
 *      accumulating in the cache. Switching the active config just picks a
 *      different (already-hot) cache entry; no loading flash, no lost lines.
 *
 * the hook intentionally ignores the `useQueries` return value - callers only
 * need the subscription side-effect. The active `Viewer` reads the same cache
 * entries through `useStreamQuery`
 */
export function useTaskLogsStreamsWarmup({
  jobs,
  workspace,
  enabled,
  debugLog,
}: {
  jobs: ITaskLogsStreamWarmupJob[];
  workspace: WorkspaceContext;
  enabled: boolean;
  debugLog: (params: { level: TLogLevel; message: string; payload?: unknown }) => void;
}) {
  useQueries({
    queries: jobs.map(({ jobId, configId }) =>
      buildTaskLogsStreamQueryOptions({
        jobId,
        workspace,
        configId,
        enabled,
        debugLog,
      })
    ),
  });
}
