import { queryOptions, useQuery } from '@tanstack/react-query';

import { listExecutionsBySimulationId } from '@/entity-configuration/domain/simulation/simulation-campaign';
import { getLatestSimulationExecution } from '@/entity-configuration/domain/simulation/status-utils';
import { buildTaskLogsStreamQueryOptions } from '@/features/task-logs-stream/hooks/use-stream-query';
import { steppedPercent } from '@/features/task-logs-stream/simulation-progress';

import type { WorkspaceContext } from '@/types/common';

export type TSimulationProgress = 'initialization' | 'finalizing' | number;

/** The launch-system job of a simulation's latest execution: only launch-system executions have one. */
export function simulationJobIdQueryOptions({
  simulationId,
  context,
  enabled,
}: {
  simulationId?: string;
  context: WorkspaceContext;
  enabled: boolean;
}) {
  return queryOptions({
    queryKey: ['scan-config-simulation-execution-id', context, simulationId],
    queryFn: async () => {
      const executions = await listExecutionsBySimulationId({
        // biome-ignore lint/style/noNonNullAssertion: query is only enabled with a simulation
        simulationId: simulationId!,
        context,
      });
      return getLatestSimulationExecution({ executions })?.execution_id ?? null;
    },
    enabled: enabled && Boolean(simulationId),
  });
}

const quiet = () => {};

/**
 * How far a running simulation has got, read from the task log the launch system streams for
 * it: 'initialization' from when its task runs until the simulator starts stepping, then the
 * percentage of the run it reports, then 'finalizing' once it has stepped to the end and its
 * results are being written. Null while it isn't running, for a simulation the launch system
 * doesn't run, and when its log can't be read.
 */
export function useSimulationProgress({
  simulationId,
  jobId,
  context,
  running,
}: {
  simulationId: string;
  /** The job it was launched as from this page, known before its execution is read. */
  jobId?: string;
  context: WorkspaceContext;
  running: boolean;
}): TSimulationProgress | null {
  const { data: latestJobId } = useQuery(
    simulationJobIdQueryOptions({ simulationId, context, enabled: running && !jobId })
  );
  const job = jobId ?? latestJobId ?? undefined;

  // The same stream the task log viewer reads, so one connection serves both.
  const { data: percent, isError } = useQuery({
    ...buildTaskLogsStreamQueryOptions({
      jobId: job,
      workspace: context,
      configId: simulationId,
      enabled: running,
      debugLog: quiet,
    }),
    select: steppedPercent,
  });

  if (!running || !job) return null;
  if (typeof percent === 'number') return percent >= 100 ? 'finalizing' : percent;
  return isError ? null : 'initialization';
}
