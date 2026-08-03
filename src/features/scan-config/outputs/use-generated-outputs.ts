import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  getOutputStrategyById,
  resolveStrategyForRef,
} from '@/features/scan-config/outputs/registry';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { TResolvedOutput } from '@/features/scan-config/outputs/types';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

type Args = {
  execution?: ITaskActivity;
  context: WorkspaceContext;
  /**
   * Whether strategies may poll for assets written after a run finishes. Off when viewing a past
   * campaign, where nothing new is coming.
   */
  pollingEnabled?: boolean;
};

type Result = {
  files: TActivityCustomFile[];
  isLoading: boolean;
};

/**
 * The output files of a run, whatever it generated.
 *
 * Every entry of the activity's `generated` array is resolved through the output strategy that
 * claims it, so a run that produces several entities lists all of them — reading only the first
 * hides the rest, and a workflow that generates a shape the caller did not anticipate shows
 * nothing at all.
 */
export function useGeneratedOutputs({ execution, context, pollingEnabled = true }: Args): Result {
  const refs = useMemo(() => execution?.generated ?? [], [execution?.generated]);

  const queries = useQueries({
    queries: refs.map((ref) => ({
      // the ref's own type is deliberately not in the key: it may be absent and get resolved
      // inside the query, and the entity behind an id cannot change type
      queryKey: ['scan-config-generated-output', context.virtualLabId, context.projectId, ref.id],
      queryFn: async (): Promise<TResolvedOutput | null> => {
        const resolved = await resolveStrategyForRef({ ref, context });
        if (!resolved) return null;

        return resolved.strategy.resolve({ ref: resolved.ref, context });
      },
      enabled: !!ref.id,
      refetchInterval: (query: {
        state: { data: TResolvedOutput | null | undefined; dataUpdateCount: number };
      }) => {
        const data = query.state.data ?? undefined;
        const strategy = getOutputStrategyById(data?.strategyId);
        if (!pollingEnabled || !strategy?.refetchInterval) return false;

        return strategy.refetchInterval({ data, dataUpdateCount: query.state.dataUpdateCount });
      },
    })),
  });

  const files = useMemo(
    () =>
      queries.flatMap(({ data }) => {
        if (!data) return [];

        const strategy = getOutputStrategyById(data.strategyId);
        return strategy ? strategy.toFiles(data) : [];
      }),
    [queries]
  );

  return { files, isLoading: queries.some((query) => query.isLoading) };
}
